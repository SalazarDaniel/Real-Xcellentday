"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { ESTADO_TAREA, PRIORIDAD, fecha, hoyISO } from "@/lib/format";
import type { EstadoTarea, PrioridadTarea, Tarea } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Button, Card, Empty, Loading, Notice, SelectField, TextField, cx } from "./ui";

const VACIA = { titulo: "", descripcion: "", fecha_limite: "", prioridad: "MEDIA" as PrioridadTarea };
const PRIO_CLASE: Record<PrioridadTarea, string> = {
  ALTA: "bg-rose/20 text-rose-800",
  MEDIA: "bg-honey/20 text-[#7a5a35]",
  BAJA: "bg-black/5 text-black/60",
};

const selectChico = "h-9 rounded-lg border border-black/20 bg-white px-2 text-[13px]";

/**
 * Lista de tareas (RF09). Con `bodaId` muestra las de una boda y permite crearlas/eliminarlas;
 * sin él, muestra las de todas las bodas activas.
 */
export function TareasLista({ bodaId, activa = true, onChange }: { bodaId?: string; activa?: boolean; onChange?: () => void }) {
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [vencidas, setVencidas] = useState(false);

  const qs = new URLSearchParams();
  if (estado) qs.set("estado", estado);
  if (prioridad) qs.set("prioridad", prioridad);
  if (vencidas && !bodaId) qs.set("vencidas", "true");
  const { data, error, loading, reload } = useApi<Tarea[]>(`${bodaId ? `/bodas/${bodaId}/tareas` : "/tareas"}?${qs}`);

  const [form, setForm] = useState(VACIA);
  const [formErr, setFormErr] = useState<ApiError | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const refrescar = async () => {
    await reload();
    onChange?.();
  };

  async function crear(e: FormEvent | null, forzar = false) {
    e?.preventDefault();
    setFormErr(null);
    try {
      await api(`/bodas/${bodaId}/tareas`, { method: "POST", body: { ...form, descripcion: form.descripcion || null, confirmar: forzar } });
      setForm(VACIA);
      setConfirmar(null);
      await refrescar();
    } catch (err) {
      const ae = err as ApiError;
      if (ae.code === "FECHA_POSTERIOR_BODA") setConfirmar(ae.message);
      else setFormErr(ae);
    }
  }

  async function accion(fn: () => Promise<unknown>) {
    setAviso(null);
    try {
      await fn();
      await refrescar();
    } catch (err) {
      setAviso((err as ApiError).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {bodaId && activa ? (
        <Card className="p-6">
          <form onSubmit={(e) => void crear(e)} noValidate className="flex flex-col gap-5">
            <h2 className="font-display text-xl font-semibold">Nueva tarea</h2>
            <div className="grid gap-5 md:grid-cols-[2fr_1fr_1fr]">
              <TextField label="Título" value={form.titulo} maxLength={150} onChange={(e) => setForm({ ...form, titulo: e.target.value })} error={formErr?.campo("titulo")} />
              <TextField label="Fecha límite" type="date" min={hoyISO()} value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} error={formErr?.campo("fecha_limite")} />
              <SelectField label="Prioridad" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value as PrioridadTarea })}>
                {Object.entries(PRIORIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </SelectField>
            </div>
            <TextField label="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            {formErr && !formErr.errores.length ? <Notice tone="danger">{formErr.message}</Notice> : null}
            {confirmar ? (
              <Notice tone="warning">
                {confirmar}{" "}
                <button type="button" className="font-medium underline" onClick={() => void crear(null, true)}>Guardar de todos modos</button>
              </Notice>
            ) : null}
            <Button icon={Plus} className="w-fit" disabled={!form.titulo || !form.fecha_limite}>Agregar tarea</Button>
          </form>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-[13px]">
        <label className="flex items-center gap-2">
          Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectChico}>
            <option value="">Todos</option>
            {Object.entries(ESTADO_TAREA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Prioridad
          <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className={selectChico}>
            <option value="">Todas</option>
            {Object.entries(PRIORIDAD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        {!bodaId && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={vencidas} onChange={(e) => setVencidas(e.target.checked)} className="size-4 accent-black" />
            Solo vencidas
          </label>
        )}
      </div>

      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {loading && !data ? (
        <Loading />
      ) : data && data.length ? (
        <Card className="overflow-x-auto shadow-none">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.3px] text-black/60 uppercase">
                <th className="px-4 py-3 font-medium">Tarea</th>
                {!bodaId && <th className="px-4 py-3 font-medium">Evento</th>}
                <th className="px-4 py-3 font-medium">Fecha límite</th>
                <th className="px-4 py-3 font-medium">Prioridad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                {bodaId && <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className={cx("border-b border-line last:border-0", t.estado === "COMPLETADA" && "text-black/40", t.vencida && "bg-rose/5")}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{t.titulo}</span>
                    {t.descripcion ? <span className="block text-black/50">{t.descripcion}</span> : null}
                  </td>
                  {!bodaId && (
                    <td className="px-4 py-2.5">
                      <Link href={`/eventos/${t.boda_id}?tab=tareas`} className="underline-offset-2 hover:underline">{t.pareja}</Link>
                    </td>
                  )}
                  <td className="px-4 py-2.5">
                    {fecha(t.fecha_limite)}
                    {t.vencida ? <span className="ml-1 text-rose-700">· vencida</span> : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cx("inline-flex h-[21px] items-center rounded px-2 text-[11px] font-medium", PRIO_CLASE[t.prioridad])}>{PRIORIDAD[t.prioridad]}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      aria-label={`Estado de ${t.titulo}`}
                      value={t.estado}
                      onChange={(e) => void accion(() => api(`/tareas/${t.id}`, { method: "PATCH", body: { estado: e.target.value as EstadoTarea } }))}
                      className={selectChico}
                    >
                      {Object.entries(ESTADO_TAREA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  {bodaId && (
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="danger" icon={Trash2} aria-label={`Eliminar ${t.titulo}`} onClick={() => void accion(() => api(`/tareas/${t.id}`, { method: "DELETE" }))} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Empty title={estado || prioridad || vencidas ? "Ninguna tarea coincide con el filtro" : "Sin tareas por ahora"} />
      )}
    </div>
  );
}
