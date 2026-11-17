"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, Loading, Notice, SelectField, StatusPill, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { ESTADO_PAGO, TIPO_SERVICIO, fecha, hoyISO, money } from "@/lib/format";
import type { Concepto, Presupuesto, Proveedor } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const TONO_PAGO = { PENDIENTE: "honey", PAGADO: "sage", VENCIDO: "rose" } as const;
type Run = (fn: () => Promise<Presupuesto>) => Promise<boolean>;

export function PresupuestoTab({ bodaId, onChange }: { bodaId: string; onChange: () => void }) {
  const { data: p, setData, error, loading } = useApi<Presupuesto>(`/bodas/${bodaId}/presupuesto`);
  const proveedores = useApi<Proveedor[]>("/proveedores?activo=true");
  const [aviso, setAviso] = useState<string | null>(null);
  const [editTotal, setEditTotal] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState({ descripcion: "", monto_acordado: "", proveedor_id: "" });
  const [nuevoErr, setNuevoErr] = useState<ApiError | null>(null);

  const run: Run = async (fn) => {
    setAviso(null);
    try {
      setData(await fn()); // los totales se actualizan sin recargar (RF07 CA4)
      onChange();
      return true;
    } catch (e) {
      setAviso((e as ApiError).message);
      return false;
    }
  };

  if (loading && !p) return <Loading />;
  if (error || !p) return <Notice tone="danger">{error?.message}</Notice>;

  async function agregarConcepto(e: FormEvent) {
    e.preventDefault();
    setNuevoErr(null);
    try {
      const r = await api<Presupuesto>(`/bodas/${bodaId}/presupuesto/conceptos`, {
        method: "POST",
        body: {
          descripcion: nuevo.descripcion,
          monto_acordado: nuevo.monto_acordado === "" ? null : Number(nuevo.monto_acordado),
          proveedor_id: nuevo.proveedor_id ? Number(nuevo.proveedor_id) : null,
        },
      });
      setData(r);
      onChange();
      setNuevo({ descripcion: "", monto_acordado: "", proveedor_id: "" });
    } catch (err) {
      setNuevoErr(err as ApiError);
    }
  }

  const cifras = [
    { label: "Comprometido", value: p.monto_comprometido },
    { label: "Pagado", value: p.monto_pagado },
    { label: "Saldo pendiente", value: p.saldo_pendiente },
    { label: "Sin asignar", value: p.disponible, danger: p.disponible < 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}

      <Card className="flex flex-col gap-4 p-6">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-black/50">Presupuesto total</dt>
            <dd>
              {editTotal === null ? (
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-semibold">{money(p.monto_total)}</span>
                  <button className="text-xs underline text-black/60" onClick={() => setEditTotal(String(p.monto_total))}>Ajustar</button>
                </span>
              ) : (
                <form
                  className="flex items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await run(() => api(`/bodas/${bodaId}/presupuesto`, { method: "PATCH", body: { monto_total: Number(editTotal) } }));
                    if (ok) setEditTotal(null);
                  }}
                >
                  <label htmlFor="total" className="sr-only">Presupuesto total</label>
                  <input id="total" type="number" min={0} step="0.01" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} className="h-9 w-32 rounded-lg border border-black/20 px-2 text-sm" />
                  <Button size="sm">Guardar</Button>
                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditTotal(null)}>Cancelar</Button>
                </form>
              )}
            </dd>
          </div>
          {cifras.map((c) => (
            <div key={c.label} className="flex flex-col gap-1">
              <dt className="text-xs text-black/50">{c.label}</dt>
              <dd className={c.danger ? "text-[15px] font-medium text-rose-700" : "text-[15px] font-medium"}>{money(c.value)}</dd>
            </div>
          ))}
        </dl>
        {p.excedido ? (
          <Notice tone="warning">Presupuesto excedido: los conceptos suman {money(p.monto_comprometido)} y el total es {money(p.monto_total)}.</Notice>
        ) : null}
      </Card>

      {p.conceptos.map((c) => <ConceptoCard key={c.id} concepto={c} run={run} />)}

      <Card className="p-6">
        <form onSubmit={agregarConcepto} noValidate className="flex flex-col gap-5">
          <h2 className="font-display text-xl font-semibold">Agregar concepto</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            <TextField label="Concepto" placeholder="Banquete, música, fotografía…" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} error={nuevoErr?.campo("descripcion")} />
            <TextField label="Monto acordado (MXN)" type="number" min={0} step="0.01" value={nuevo.monto_acordado} onChange={(e) => setNuevo({ ...nuevo, monto_acordado: e.target.value })} error={nuevoErr?.campo("monto_acordado")} />
            <SelectField label="Proveedor (opcional)" value={nuevo.proveedor_id} onChange={(e) => setNuevo({ ...nuevo, proveedor_id: e.target.value })}>
              <option value="">Gasto general</option>
              {proveedores.data?.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({TIPO_SERVICIO[x.tipo_servicio]})</option>)}
            </SelectField>
          </div>
          {nuevoErr && !nuevoErr.errores.length ? <Notice tone="danger">{nuevoErr.message}</Notice> : null}
          <Button icon={Plus} className="w-fit" disabled={!nuevo.descripcion.trim()}>Agregar concepto</Button>
        </form>
      </Card>
    </div>
  );
}

function ConceptoCard({ concepto: c, run }: { concepto: Concepto; run: Run }) {
  const [abierto, setAbierto] = useState(false);
  const [pago, setPago] = useState({ monto: "", fecha_vencimiento: "", pagado: false, fecha_pago: hoyISO() });
  const porProgramar = c.monto_acordado - c.monto_programado;

  async function programar(e: FormEvent) {
    e.preventDefault();
    const ok = await run(() =>
      api(`/conceptos/${c.id}/pagos`, {
        method: "POST",
        body: { monto: Number(pago.monto), fecha_vencimiento: pago.fecha_vencimiento, fecha_pago: pago.pagado ? pago.fecha_pago : null },
      }),
    );
    if (ok) {
      setAbierto(false);
      setPago({ monto: "", fecha_vencimiento: "", pagado: false, fecha_pago: hoyISO() });
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">{c.descripcion}</h3>
          <p className="text-[13px] text-black/50">{c.proveedor ? c.proveedor.nombre : "Gasto general"}</p>
        </div>
        <dl className="flex gap-6 text-right">
          {[["Acordado", c.monto_acordado], ["Pagado", c.monto_pagado], ["Saldo", c.saldo]].map(([l, v]) => (
            <div key={l as string}>
              <dt className="text-xs text-black/50">{l}</dt>
              <dd className="text-sm font-medium">{money(v as number)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {c.pagos.length ? (
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.3px] text-black/60 uppercase">
                <th className="py-2 pr-4 font-medium">Monto</th>
                <th className="py-2 pr-4 font-medium">Vence</th>
                <th className="py-2 pr-4 font-medium">Pagado el</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {c.pagos.map((pg) => (
                <tr key={pg.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 font-medium">{money(pg.monto)}</td>
                  <td className="py-2 pr-4 text-black/60">{fecha(pg.fecha_vencimiento)}</td>
                  <td className="py-2 pr-4 text-black/60">{fecha(pg.fecha_pago)}</td>
                  <td className="py-2 pr-4"><StatusPill tone={TONO_PAGO[pg.estado]}>{ESTADO_PAGO[pg.estado]}</StatusPill></td>
                  <td className="py-2">
                    {pg.estado !== "PAGADO" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => void run(() => api(`/pagos/${pg.id}/pagar`, { method: "POST", body: {} }))}>Registrar pago</Button>
                        <Button size="sm" variant="danger" icon={Trash2} aria-label="Eliminar pago" onClick={() => void run(() => api(`/pagos/${pg.id}`, { method: "DELETE" }))} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-black/50">Sin pagos programados.</p>
      )}

      {abierto ? (
        <form onSubmit={programar} noValidate className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
          <TextField label="Monto" type="number" min={0} step="0.01" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} hint={`Por programar: ${money(porProgramar)}`} />
          <TextField label="Fecha de vencimiento" type="date" value={pago.fecha_vencimiento} onChange={(e) => setPago({ ...pago, fecha_vencimiento: e.target.value })} />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={pago.pagado} onChange={(e) => setPago({ ...pago, pagado: e.target.checked })} className="size-4 accent-black" />
            Ya está pagado
          </label>
          {pago.pagado ? <TextField label="Fecha de pago" type="date" value={pago.fecha_pago} onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })} /> : null}
          <div className="flex gap-3 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button disabled={!pago.monto || !pago.fecha_vencimiento}>Guardar pago</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {porProgramar > 0 && <Button variant="outline" size="sm" icon={Plus} onClick={() => setAbierto(true)}>Programar pago</Button>}
          {c.monto_pagado === 0 && (
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => void run(() => api(`/conceptos/${c.id}`, { method: "DELETE" }))}>Eliminar concepto</Button>
          )}
        </div>
      )}
    </Card>
  );
}
