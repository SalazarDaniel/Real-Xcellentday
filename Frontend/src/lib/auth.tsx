"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { TokenOut, Usuario } from "./types";

interface AuthState {
  /** undefined mientras se lee sessionStorage en el navegador; null si no hay sesión. */
  user: Usuario | null | undefined;
  login: (correo: string, password: string) => Promise<Usuario>;
  registrar: (datos: {
    nombre_completo: string;
    correo: string;
    password: string;
    password_confirmacion: string;
  }) => Promise<Usuario>;
  logout: () => Promise<void>;
  /** Mensaje para la pantalla de inicio de sesión («Sesión cerrada», «Tu sesión expiró»). */
  flash: string | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function homeFor(user: Usuario) {
  return user.rol === "ADMINISTRADOR" ? "/usuarios" : "/eventos";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null | undefined>(undefined);
  const [flash, setFlash] = useState<string | null>(null);

  // sessionStorage solo existe en el navegador: se lee después de hidratar.
  useEffect(() => {
    const raw = tokenStore.getUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un sistema externo
    setUser(raw && tokenStore.get() ? (JSON.parse(raw) as Usuario) : null);
  }, []);

  const finish = useCallback(
    (message: string) => {
      tokenStore.clear();
      setFlash(message);
      setUser(null);
      router.replace("/login");
    },
    [router],
  );

  // Si la API responde 401 (token expirado o sesión cerrada), regresar al inicio de sesión (RF03).
  useEffect(() => {
    setUnauthorizedHandler((msg) =>
      finish(msg === "Tu sesión expiró" ? "Tu sesión expiró" : "Inicia sesión para continuar"),
    );
    return () => setUnauthorizedHandler(null);
  }, [finish]);

  const guardar = useCallback((data: TokenOut) => {
    tokenStore.set(data.access_token);
    tokenStore.setUser(JSON.stringify(data.usuario));
    setFlash(null);
    setUser(data.usuario);
    return data.usuario;
  }, []);

  const login = useCallback(
    async (correo: string, password: string) =>
      guardar(
        await api<TokenOut>("/auth/login", {
          method: "POST",
          body: { correo, password },
          auth: false,
        }),
      ),
    [guardar],
  );

  const registrar = useCallback<AuthState["registrar"]>(
    async (datos) =>
      guardar(await api<TokenOut>("/auth/registro", { method: "POST", body: datos, auth: false })),
    [guardar],
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* el token ya podía estar invalidado */
    }
    finish("Sesión cerrada");
  }, [finish]);

  const value = useMemo(
    () => ({ user, login, registrar, logout, flash }),
    [user, login, registrar, logout, flash],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
