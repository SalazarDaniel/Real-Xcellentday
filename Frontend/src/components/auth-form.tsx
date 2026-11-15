import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Field } from "./ui";

/** Columna centrada de 448 px usada por «Inicio de sesión» y «Registrarse». */
export function AuthLayout({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <main className={`flex min-h-screen justify-center px-4 py-16 sm:py-24 ${bg}`}>
      <div className="flex w-full max-w-[448px] flex-col gap-8">
        <Link href="/" className="flex w-fit items-center gap-2 text-sm tracking-[0.2px] text-black/60 hover:text-black">
          <ArrowLeft className="size-4" aria-hidden />
          Volver
        </Link>
        {children}
      </div>
    </main>
  );
}

/** Campo del diseño de autenticación: esquinas rectas y 50 px de alto. */
export function AuthField({ label, error, ...props }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className="h-[50px] w-full border border-black/20 bg-white px-4 text-[15px] outline-none focus:border-black aria-[invalid=true]:border-rose-600"
          {...props}
        />
      )}
    </Field>
  );
}
