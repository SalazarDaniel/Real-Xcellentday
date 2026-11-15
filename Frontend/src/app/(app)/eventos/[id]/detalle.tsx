"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, CalendarDays, CreditCard, ListChecks, MapPin, PiggyBank, Store, UserCheck, Users } from "lucide-react";
import { TareasLista } from "@/components/tareas";
import { Card, Loading, Notice, ProgressBar, cx } from "@/components/ui";
import { fecha } from "@/lib/format";
import type { Expediente } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { InvitadosTab } from "./invitados";
import { PagosTab } from "./pagos";
import { PresupuestoTab } from "./presupuesto";
import { ProveedoresTab } from "./proveedores-boda";

const TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "pagos", label: "Pagos", icon: CreditCard },
  { id: "invitados", label: "Invitados", icon: UserCheck },
  { id: "presupuesto", label: "Presupuesto", icon: PiggyBank },
  { id: "tareas", label: "Tareas", icon: ListChecks },
  { id: "proveedores", label: "Proveedores", icon: Store },
];

export default function Detalle() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab")! : "pagos";
  const exp = useApi<Expediente>(`/bodas/${id}/expediente`);

  // Un borrador todavía no tiene expediente: se continúa en el asistente
  useEffect(() => {
    if (exp.error?.status === 409) router.replace(`/eventos/nuevo?borrador=${id}`);
  }, [exp.error, id, router]);

  if (exp.loading && !exp.data) return <Loading />;
  if (exp.error || !exp.data) {
    return <Notice tone="danger">{exp.error?.status === 403 ? "No tienes acceso a este evento." : exp.error?.message}</Notice>;
  }

  const { boda } = exp.data;
  const nombre = boda.pareja?.nombre ?? "Evento";

  return (
    <>
      <Link href="/eventos" className="flex h-9 w-fit items-center gap-2 text-sm text-black/70 hover:text-black">
        <ArrowLeft className="size-4" aria-hidden />
        Volver a eventos
      </Link>

      {params.get("creada") ? <Notice tone="success">Evento registrado. Ya puedes organizar pagos, invitados y tareas.</Notice> : null}

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-[48px] font-semibold tracking-[-0.32px]">{nombre}</h1>
        <p className="text-[15px] text-black/60">Información detallada del evento</p>
      </header>

      <Card className="flex flex-col gap-6 p-6">
        <dl className="grid gap-6 sm:grid-cols-3">
          <Dato icon={CalendarDays} label="Fecha" value={fecha(boda.fecha)} />
          <Dato icon={MapPin} label="Lugar" value={boda.lugar ?? "—"} />
          <Dato icon={Users} label="Invitados" value={boda.invitados_estimados != null ? `${boda.invitados_estimados} personas` : "—"} />
        </dl>
        <div className="flex flex-col gap-2 border-t border-line pt-6">
          <div className="flex items-center justify-between text-xs">
            <span className="text-black/60">Progreso general</span>
            <span className="font-medium">{boda.progreso ?? 0}%</span>
          </div>
          <ProgressBar value={boda.progreso ?? 0} label="Progreso general del evento" />
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        <div role="tablist" aria-label="Secciones del evento" className="flex gap-1 overflow-x-auto rounded-[10px] border border-black/10 bg-white p-[3px]">
          {TABS.map((t) => (
            <Link
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              href={`/eventos/${id}?tab=${t.id}`}
              replace
              scroll={false}
              className={cx(
                "flex h-[29px] min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-4 text-[13px] transition-colors",
                tab === t.id ? "bg-black text-white" : "text-black hover:bg-black/5",
              )}
            >
              <t.icon className="size-4" aria-hidden />
              {t.label}
            </Link>
          ))}
        </div>

        <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
          {tab === "pagos" && <PagosTab bodaId={id} onChange={exp.reload} />}
          {tab === "invitados" && <InvitadosTab bodaId={id} />}
          {tab === "presupuesto" && <PresupuestoTab bodaId={id} onChange={exp.reload} />}
          {tab === "tareas" && <TareasLista bodaId={id} activa={boda.estado === "ACTIVA"} onChange={exp.reload} />}
          {tab === "proveedores" && <ProveedoresTab expediente={exp.data} onChange={exp.reload} />}
        </div>
      </div>
    </>
  );
}

function Dato({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="flex items-center gap-2 text-[11px] tracking-[0.3px] text-black/50 uppercase">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
