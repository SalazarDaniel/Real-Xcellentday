"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthField, AuthLayout } from "@/components/auth-form";
import { Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";

export default function LoginForm() {
  const { user, login, flash } = useAuth();
  const router = useRouter();
  const from = useSearchParams().get("from");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [olvido, setOlvido] = useState(false);
  const [sending, setSending] = useState(false);

  // Solo se aceptan rutas internas para evitar redirecciones abiertas
  const destino = (rol: Parameters<typeof homeFor>[0]) =>
    from && from.startsWith("/") && !from.startsWith("//") && rol.rol === "WEDDING_PLANNER" ? from : homeFor(rol);

  useEffect(() => {
    if (user) router.replace(destino(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await login(correo.trim(), password);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout bg="bg-white">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="font-display text-4xl leading-[54px] font-semibold tracking-[-0.36px]">Xcellent Day</h1>
        <p className="text-[15px] tracking-[0.2px] text-black/60">Bienvenido de nuevo.</p>
      </header>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {flash && !error ? <Notice>{flash}</Notice> : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <AuthField label="Correo electrónico" type="email" autoComplete="email" placeholder="tu@email.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <AuthField label="Contraseña" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="text-right">
          <button type="button" onClick={() => setOlvido((o) => !o)} aria-expanded={olvido} className="text-[13px] text-black/60 hover:text-black">
            ¿Olvidaste tu contraseña?
          </button>
          {olvido ? <p className="mt-2 text-left text-[13px] text-black/60">Pide al administrador de tu equipo que restablezca tu contraseña.</p> : null}
        </div>
        <button disabled={sending || !correo || !password} className="h-12 bg-black text-[15px] font-medium tracking-[0.5px] text-white hover:bg-black/85 disabled:bg-black/40">
          {sending ? "Entrando…" : "Continuar planeando"}
        </button>
      </form>
      <p className="text-center text-sm text-black/60">
        ¿No tienes cuenta? <Link href="/registro" className="text-base font-medium text-black">Regístrate</Link>
      </p>
    </AuthLayout>
  );
}
