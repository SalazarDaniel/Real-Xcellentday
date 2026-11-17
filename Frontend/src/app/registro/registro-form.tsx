"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField, AuthLayout } from "@/components/auth-form";
import { Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";

const VACIO = { nombre_completo: "", correo: "", password: "", password_confirmacion: "" };

export default function RegistroForm() {
  const { user, registrar } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState<ApiError | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) router.replace(homeFor(user));
  }, [user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await registrar({ ...form, correo: form.correo.trim() });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSending(false);
    }
  }

  const set = (k: keyof typeof VACIO) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthLayout bg="bg-canvas">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="font-display text-4xl leading-[54px] font-semibold tracking-[-0.36px]">Únete a Xcellent Day</h1>
        <p className="text-[15px] tracking-[0.2px] text-black/60">Crea tu cuenta y comienza a planear bodas increíbles</p>
      </header>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error && !error.errores.length ? <Notice tone="danger">{error.message}</Notice> : null}
        <AuthField label="Nombre completo" autoComplete="name" placeholder="María García" maxLength={100} value={form.nombre_completo} onChange={set("nombre_completo")} error={error?.campo("nombre_completo")} />
        <AuthField label="Correo electrónico" type="email" autoComplete="email" placeholder="tu@email.com" value={form.correo} onChange={set("correo")} error={error?.campo("correo")} />
        <AuthField label="Contraseña" type="password" autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={set("password")} error={error?.campo("password")} />
        <AuthField label="Confirmar contraseña" type="password" autoComplete="new-password" placeholder="••••••••" value={form.password_confirmacion} onChange={set("password_confirmacion")} error={error?.errores.find((x) => x.campo === "")?.mensaje} />
        <p className="text-[13px] leading-[20.8px] text-black/50">
          Mínimo 8 caracteres, una mayúscula y un número. Al crear una cuenta, aceptas nuestros{" "}
          <span className="text-sand">Términos y Condiciones</span> y <span className="text-sand">Política de Privacidad</span>.
        </p>
        <button disabled={sending} className="mt-5 h-12 bg-black text-[15px] font-medium tracking-[0.5px] text-white hover:bg-black/85 disabled:bg-black/40">
          {sending ? "Creando cuenta…" : "Empezar a planear"}
        </button>
      </form>
      <p className="text-center text-sm text-black/60">
        ¿Ya tienes cuenta? <Link href="/login" className="text-base font-medium text-black">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}
