"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign } from "lucide-react";
import { Button, Card, Empty, Loading, Notice, StatusPill, cx } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { ESTADO_PAGO, fecha, money } from "@/lib/format";
import type { EstadoPago, Presupuesto } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const TONO: Record<EstadoPago, "sage" | "honey" | "rose"> = { PAGADO: "sage", PENDIENTE: "honey", VENCIDO: "rose" };
const COLOR: Record<EstadoPago, string> = { PAGADO: "#7c9885", PENDIENTE: "#d4a574", VENCIDO: "#c98b8b" };
const ORDEN: EstadoPago[] = ["PAGADO", "PENDIENTE", "VENCIDO"];

export function PagosTab({ bodaId, onChange }: { bodaId: string; onChange: () => void }) {
  const { data: p, setData, error, loading } = useApi<Presupuesto>(`/bodas/${bodaId}/presupuesto`);
  const [aviso, setAviso] = useState<string | null>(null);

  if (loading && !p) return <Loading />;
  if (error || !p) return <Notice tone="danger">{error?.message}</Notice>;

  const pagos = p.conceptos
    .flatMap((c) => c.pagos.map((pg) => ({ ...pg, quien: c.proveedor?.nombre ?? c.descripcion })))
    .sort((a, b) => (a.fecha_pago ?? a.fecha_vencimiento).localeCompare(b.fecha_pago ?? b.fecha_vencimiento));
  const totales = Object.fromEntries(
    ORDEN.map((e) => [e, pagos.filter((x) => x.estado === e).reduce((s, x) => s + x.monto, 0)]),
  ) as Record<EstadoPago, number>;

  async function pagar(id: number) {
    setAviso(null);
    try {
      setData(await api<Presupuesto>(`/pagos/${id}/pagar`, { method: "POST", body: {} }));
      onChange();
    } catch (e) {
      setAviso((e as ApiError).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_1fr] xl:grid-cols-[minmax(0,400px)_1fr]">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {ORDEN.map((e) => (
            <div key={e} className={cx("flex items-center gap-4 rounded-[10px] p-5", TONO[e] === "sage" ? "bg-sage" : TONO[e] === "honey" ? "bg-honey" : "bg-rose")}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-white/20 text-white" aria-hidden>
                <DollarSign className="size-5" />
              </span>
              <div className="text-white">
                <p className="text-[11px] text-white/70">{ESTADO_PAGO[e]}</p>
                <p className="text-[22px] leading-7 font-medium">{money(totales[e])}</p>
              </div>
            </div>
          ))}
        </div>
        <Card className="flex flex-col gap-4 bg-canvas p-6 shadow-none">
          <h2 className="text-[15px] font-medium">Distribución de Pagos</h2>
          <Donut totales={totales} />
        </Card>
      </div>

      {pagos.length ? (
        <Card className="overflow-x-auto shadow-none">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.3px] text-black/60 uppercase">
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((pg) => (
                <tr key={pg.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">{pg.quien}</td>
                  <td className="px-4 py-2.5 font-semibold">{money(pg.monto)}</td>
                  <td className="px-4 py-2.5 text-black/60">
                    {fecha(pg.fecha_pago ?? pg.fecha_vencimiento)}
                    {pg.estado !== "PAGADO" ? <span className="sr-only"> (vencimiento)</span> : null}
                  </td>
                  <td className="px-4 py-2.5"><StatusPill tone={TONO[pg.estado]}>{ESTADO_PAGO[pg.estado]}</StatusPill></td>
                  <td className="px-4 py-2.5 text-right">
                    {pg.estado !== "PAGADO" ? (
                      <Button size="sm" variant="outline" onClick={() => void pagar(pg.id)}>Registrar pago</Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Empty title="Sin pagos programados">
          <Link href={`/eventos/${bodaId}?tab=presupuesto`} replace className="text-sm underline">
            Programa pagos desde Presupuesto
          </Link>
        </Empty>
      )}
      <p className="text-xs text-black/50">Los pagos son simulados: aquí se registran, no se cobra dinero real.</p>
    </div>
  );
}

/** Dona SVG: cada segmento es un arco del círculo con stroke-dasharray. */
function Donut({ totales }: { totales: Record<EstadoPago, number> }) {
  const total = ORDEN.reduce((s, e) => s + totales[e], 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  const gap = total ? 2 : 0;
  let offset = 0;
  const resumen = ORDEN.map((e) => `${ESTADO_PAGO[e]} ${money(totales[e])}`).join(", ");
  return (
    <figure className="flex flex-1 flex-col items-center justify-center gap-4">
      <svg viewBox="0 0 200 200" className="size-[200px]" role="img" aria-label={`Distribución de pagos: ${resumen}`}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#e7e5e4" strokeWidth="28" />
        {total
          ? ORDEN.map((e) => {
              const len = (totales[e] / total) * c;
              const seg = (
                <circle
                  key={e}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke={COLOR[e]}
                  strokeWidth="28"
                  strokeDasharray={`${Math.max(len - gap, 0)} ${c}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 100 100)"
                />
              );
              offset += len;
              return len > 0 ? seg : null;
            })
          : null}
      </svg>
      <figcaption className="flex flex-wrap justify-center gap-4 text-xs text-black/60">
        {ORDEN.map((e) => (
          <span key={e} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: COLOR[e] }} aria-hidden />
            {ESTADO_PAGO[e]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
