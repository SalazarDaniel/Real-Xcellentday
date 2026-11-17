"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, CalendarDays, ListChecks, LogOut, Menu, Search, Store, Users, X } from "lucide-react";
import { homeFor, useAuth } from "@/lib/auth";
import { diasTexto, fecha, iniciales, money } from "@/lib/format";
import type { Dashboard, Rol } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Loading, cx } from "./ui";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_PLANNER: NavItem[] = [
  { href: "/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/proveedores", label: "Proveedores", icon: Store },
  { href: "/tareas", label: "Tareas", icon: ListChecks },
];
const NAV_ADMIN: NavItem[] = [{ href: "/usuarios", label: "Usuarios", icon: Users }];

const ROL: Record<Rol, string> = { ADMINISTRADOR: "Administrador", WEDDING_PLANNER: "Wedding Planner" };

function Avatar({ nombre }: { nombre: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-base text-white" aria-hidden>
      {iniciales(nombre)}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user === null) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [user, router, pathname]);

  if (!user) return <div className="p-8"><Loading /></div>;

  const nav = user.rol === "ADMINISTRADOR" ? NAV_ADMIN : NAV_PLANNER;

  return (
    <div className="flex min-h-screen bg-canvas">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      {/* Sidebar */}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-black/10 bg-sidebar transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[85px] items-center justify-between border-b border-line px-6">
          <Link href={homeFor(user)} className="font-display text-2xl font-semibold tracking-[-0.24px]" onClick={() => setMenuOpen(false)}>
            Xcellent Day
          </Link>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1 px-4 pt-4">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={cx(
                  "flex h-[45px] items-center gap-3 rounded-[10px] px-4 text-sm tracking-[0.2px] transition-colors",
                  active ? "bg-black text-white" : "text-black/70 hover:bg-black/5",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-line px-4 pt-[17px] pb-4">
          <div className="flex items-center gap-3">
            <Avatar nombre={user.nombre_completo} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.nombre_completo}</p>
              <p className="text-xs text-black/50">{ROL[user.rol]}</p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-black/60 hover:bg-black/5"
          >
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
      {menuOpen ? <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-[73px] items-center gap-4 border-b border-sidebar bg-white px-4 sm:px-8">
          <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Abrir menú" aria-expanded={menuOpen}>
            <Menu className="size-5" aria-hidden />
          </button>
          {user.rol === "WEDDING_PLANNER" ? <EventSearch /> : <span className="flex-1" />}
          <div className="ml-auto flex items-center gap-4">
            {user.rol === "WEDDING_PLANNER" ? <Alerts /> : null}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.nombre_completo}</p>
              <p className="text-xs text-black/50">{ROL[user.rol]}</p>
            </div>
            <Avatar nombre={user.nombre_completo} />
          </div>
        </header>

        <main id="contenido" className="flex flex-1 flex-col gap-8 p-4 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function EventSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/eventos?q=${encodeURIComponent(q.trim())}` : "/eventos");
  }
  return (
    <form role="search" onSubmit={submit} className="relative w-full max-w-[448px] flex-1">
      <label htmlFor="buscar-eventos" className="sr-only">Buscar eventos</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-placeholder" aria-hidden />
      <input
        id="buscar-eventos"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar eventos..."
        className="h-9 w-full rounded-[10px] border border-black/20 bg-field pr-3 pl-10 text-sm outline-none placeholder:text-placeholder focus:border-black"
      />
    </form>
  );
}

/** Campana con los pagos por vencer o vencidos (RF08). */
function Alerts() {
  const { data } = useApi<Dashboard>("/dashboard");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const alertas = data?.alertas_pagos ?? [];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={alertas.length ? `Alertas de pagos: ${alertas.length}` : "Alertas de pagos"}
        className="relative flex size-9 items-center justify-center rounded-[10px] hover:bg-black/5"
      >
        <Bell className="size-5" aria-hidden />
        {alertas.length ? <span className="absolute top-1 right-1 size-2 rounded-full bg-black" aria-hidden /> : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(360px,calc(100vw-32px))] rounded-[10px] border border-black/10 bg-white p-4 shadow-lg">
          <p className="mb-3 text-sm font-medium">Pagos por atender</p>
          {alertas.length ? (
            <ul className="flex flex-col gap-2">
              {alertas.map((a) => (
                <li key={a.pago_id}>
                  <Link
                    href={`/eventos/${a.boda_id}?tab=pagos`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-lg p-2 hover:bg-black/5"
                  >
                    <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", a.nivel === "rojo" ? "bg-rose" : "bg-honey")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{a.concepto} · {a.pareja}</span>
                      <span className="block text-xs text-black/50">
                        {a.nivel === "rojo" ? "Venció" : "Vence"} {diasTexto(a.dias)}, {fecha(a.fecha_vencimiento)}
                      </span>
                    </span>
                    <span className="text-sm font-medium">{money(a.monto)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-black/50">No hay pagos por vencer en los próximos 7 días.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Restringe una página a un rol; redirige a la página de inicio del usuario si no corresponde. */
export function RequireRole({ rol, children }: { rol: Rol; children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const ok = user?.rol === rol;
  useEffect(() => {
    if (user && !ok) router.replace(homeFor(user));
  }, [user, ok, router]);
  return ok ? <>{children}</> : <Loading />;
}
