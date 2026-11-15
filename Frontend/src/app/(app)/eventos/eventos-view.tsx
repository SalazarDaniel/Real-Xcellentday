"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CreditCard, MapPin, Phone, Plus, Store, UserCheck, Users } from "lucide-react";
import { Badge, Button, Card, Empty, Loading, Modal, ModalActions, Notice, PageHeader, ProgressBar, StatCard, TextField, cx } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { ESTADO_BODA, fecha, hoyISO, money, moneyCompact } from "@/lib/format";
import type { Boda, Dashboard, EstadoBoda, Proveedor } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const FILTROS: { valor: string; label: string }[] = [
  { valor: "", label: "Todos" },
  { valor: "ACTIVA", label: "En progreso" },
  { valor: "BORRADOR", label: "Borradores" },
  { valor: "REALIZADA", label: "Realizados" },
];

const BADGE: Record<EstadoBoda, string> = {
  ACTIVA: "bg-black/5 text-black/70",
  BORRADOR: "bg-honey/20 text-[#7a5a35]",
  REALIZADA: "bg-sage/20 text-[#3e5546]",
  CANCELADA: "bg-rose/20 text-rose-800",
};

function nombreBoda(b: Boda) {
  if (b.pareja) return b.pareja.nombre;
  const p = b.datos_borrador?.pareja;
  return [p?.nombre_contrayente1, p?.nombre_contrayente2].filter(Boolean).join(" & ") || "Sin nombre todavía";
}

export default function EventosView() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const estado = params.get("estado") ?? "";

  const qs = new URLSearchParams();
  if (estado) qs.set("estado", estado);
  if (q) qs.set("q", q);
  const bodas = useApi<Boda[]>(`/bodas?${qs}`);
  const dash = useApi<Dashboard>("/dashboard");
  const proveedores = useApi<Proveedor[]>("/proveedores");
  const [nueva, setNueva] = useState(false);

  const activas = (bodas.data ?? []).filter((b) => b.estado === "ACTIVA");
  const totalInvitados = activas.reduce((s, b) => s + (b.invitados_estimados ?? 0), 0);
  const lista = (bodas.data ?? []).filter((b) => b.estado !== "CANCELADA");

  function filtrar(valor: string) {
    const next = new URLSearchParams(params);
    if (valor) next.set("estado", valor);
    else next.delete("estado");
    router.replace(`/eventos?${next}`);
  }

  return (
    <>
      <PageHeader
        title="Mis Eventos"
        sub="Gestiona y organiza todas tus bodas en un solo lugar"
        actions={
          <Button size="lg" icon={Plus} className="text-sm" onClick={() => setNueva(true)}>
            Agregar nuevo evento
          </Button>
        }
      />

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Eventos Activos" icon={CalendarDays} value={dash.data?.bodas_activas ?? "—"} />
        <StatCard label="Total Invitados" icon={UserCheck} value={bodas.data ? totalInvitados.toLocaleString("es-MX") : "—"} />
        <StatCard label="Pagos Pendientes" icon={CreditCard} value={dash.data ? moneyCompact(dash.data.finanzas.saldo_pendiente) : "—"} />
        <StatCard label="Proveedores" icon={Store} value={proveedores.data?.length ?? "—"} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrar por estado" className="inline-flex rounded-[10px] border border-black/10 bg-white p-1">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              aria-pressed={estado === f.valor}
              onClick={() => filtrar(f.valor)}
              className={cx("h-8 rounded-lg px-3 text-[13px]", estado === f.valor ? "bg-black text-white" : "text-black/70 hover:bg-black/5")}
            >
              {f.label}
            </button>
          ))}
        </div>
        {q ? (
          <p className="text-sm text-black/60">
            Resultados para «{q}» · <Link href={estado ? `/eventos?estado=${estado}` : "/eventos"} className="underline">Quitar búsqueda</Link>
          </p>
        ) : null}
      </div>

      {bodas.error ? <Notice tone="danger">{bodas.error.message}</Notice> : null}
      {bodas.loading && !bodas.data ? (
        <Loading />
      ) : lista.length ? (
        <section aria-label="Eventos" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {lista.map((b) => (
            <EventoCard key={b.id} boda={b} />
          ))}
        </section>
      ) : (
        <Empty title={q || estado ? "Ningún evento coincide" : "Todavía no tienes eventos"}>
          <Button icon={Plus} onClick={() => setNueva(true)}>Registrar la primera pareja</Button>
        </Empty>
      )}

      <NuevaParejaModal open={nueva} onClose={() => setNueva(false)} />
    </>
  );
}

function EventoCard({ boda: b }: { boda: Boda }) {
  const borrador = b.estado === "BORRADOR";
  const href = borrador ? `/eventos/nuevo?borrador=${b.id}` : `/eventos/${b.id}`;
  const fechaBoda = b.fecha ?? b.datos_borrador?.evento?.fecha ?? null;
  return (
    <Card className="flex flex-col gap-[46px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="truncate font-display text-[22px] leading-[22px] font-semibold">{nombreBoda(b)}</h2>
          <p className="flex items-center gap-2 text-[13px] text-black/60">
            <CalendarDays className="size-3.5" aria-hidden />
            {fecha(fechaBoda)}
          </p>
        </div>
        <Badge className={BADGE[b.estado]}>
          {borrador ? `Borrador · paso ${b.paso_onboarding} de 3` : ESTADO_BODA[b.estado]}
        </Badge>
      </div>
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-black/50">Invitados</dt>
            <dd className="text-[15px] font-medium">{b.invitados_estimados ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-black/50">Presupuesto</dt>
            <dd className="text-[15px] font-medium">{b.presupuesto_total != null ? money(b.presupuesto_total) : "—"}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-black/60">Progreso</span>
            <span className="text-[13px] font-medium">{b.progreso ?? 0}%</span>
          </div>
          <ProgressBar value={b.progreso ?? 0} label={`Progreso de ${nombreBoda(b)}`} />
        </div>
        <Link href={href} className="h-9 rounded-lg px-4 py-2 text-sm font-medium text-black/70 hover:bg-black/5">
          {borrador ? "Continuar registro →" : "Ver detalles →"}
        </Link>
      </div>
    </Card>
  );
}

/* ---------- Registrar nueva pareja ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** «Ana & Carlos», «Ana y Carlos» → ["Ana", "Carlos"] */
function separarNombres(s: string): [string, string] {
  const [a, ...resto] = s.split(/\s*(?:&|\by\b)\s*/i);
  return [a?.trim() ?? "", resto.join(" ").trim()];
}

/**
 * El modal del diseño captura lo esencial. Se guarda como borrador del asistente de onboarding
 * y se continúa ahí con los datos que la API exige (estilo, invitados, presupuesto).
 */
function NuevaParejaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ nombre: "", fecha: "", contacto: "", lugar: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function cerrar() {
    setForm({ nombre: "", fecha: "", contacto: "", lugar: "" });
    setErrors({});
    setAviso(null);
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const [n1, n2] = separarNombres(form.nombre);
    const contacto = form.contacto.trim();
    const telefono = contacto.replace(/\D/g, "");
    const esCorreo = EMAIL.test(contacto);
    const errs: Record<string, string> = {};
    if (!n1 || !n2) errs.nombre = "Escribe los dos nombres separados por «&», por ejemplo Ana & Carlos";
    if (!form.fecha) errs.fecha = "Elige la fecha de la boda";
    else if (form.fecha <= hoyISO()) errs.fecha = "La fecha de la boda debe ser futura";
    if (contacto && !esCorreo && telefono.length !== 10) errs.contacto = "Escribe un correo válido o un teléfono de 10 dígitos";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setAviso(null);
    try {
      const b = await api<Boda>("/bodas/borradores", {
        method: "POST",
        body: {
          paso: 1,
          pareja: {
            nombre_contrayente1: n1,
            nombre_contrayente2: n2,
            correo: esCorreo ? contacto : "",
            telefono: esCorreo ? "" : telefono,
          },
          evento: { fecha: form.fecha, lugar: form.lugar.trim(), estilo: "", invitados_estimados: "" },
        },
      });
      cerrar();
      router.push(`/eventos/nuevo?borrador=${b.id}`);
    } catch (err) {
      setAviso((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open={open} onClose={cerrar} title="Registrar nueva pareja" description="Completa los datos para crear un nuevo expediente de boda">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        {aviso ? <Notice tone="danger">{aviso}</Notice> : null}
        <TextField label="Nombre de la pareja" icon={Users} placeholder="Ej: Ana & Carlos" value={form.nombre} onChange={set("nombre")} error={errors.nombre} autoFocus />
        <TextField label="Fecha de la boda" icon={CalendarDays} type="date" min={hoyISO()} value={form.fecha} onChange={set("fecha")} error={errors.fecha} />
        <TextField label="Contacto" icon={Phone} placeholder="Teléfono o email" value={form.contacto} onChange={set("contacto")} error={errors.contacto} />
        <TextField label="Lugar de la celebración" icon={MapPin} placeholder="Nombre del lugar o dirección" value={form.lugar} onChange={set("lugar")} />
        <ModalActions onCancel={cerrar} submitLabel="Guardar evento" busy={busy} />
      </form>
    </Modal>
  );
}
