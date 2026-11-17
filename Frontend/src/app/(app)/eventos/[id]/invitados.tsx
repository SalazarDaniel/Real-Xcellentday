"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, User, Users } from "lucide-react";
import { Button, Card, Empty, Loading, Modal, ModalActions, Notice, SelectField, StatusPill, TextField, cx } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { ESTADO_RSVP } from "@/lib/format";
import type { EstadoRSVP, Invitado } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const TONO: Record<EstadoRSVP, "sage" | "honey" | "rose"> = { CONFIRMADO: "sage", PENDIENTE: "honey", RECHAZADO: "rose" };
const CARD: Record<EstadoRSVP, string> = { CONFIRMADO: "bg-sage", PENDIENTE: "bg-honey", RECHAZADO: "bg-rose" };
const PLURAL: Record<EstadoRSVP, string> = { CONFIRMADO: "Confirmados", PENDIENTE: "Pendientes", RECHAZADO: "Declinados" };
const ORDEN: EstadoRSVP[] = ["CONFIRMADO", "PENDIENTE", "RECHAZADO"];

type Form = { nombre: string; correo: string; telefono: string; mesa: string; acompanantes: string; confirmacion: EstadoRSVP };
const VACIO: Form = { nombre: "", correo: "", telefono: "", mesa: "", acompanantes: "0", confirmacion: "PENDIENTE" };

export function InvitadosTab({ bodaId }: { bodaId: string }) {
  const { data, error, loading, reload } = useApi<Invitado[]>(`/bodas/${bodaId}/invitados`);
  const [editando, setEditando] = useState<Invitado | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error || !data) return <Notice tone="danger">{error?.message}</Notice>;

  const cuenta = (e: EstadoRSVP) => data.filter((i) => i.confirmacion === e).length;

  async function cambiarEstado(inv: Invitado, confirmacion: EstadoRSVP) {
    setAviso(null);
    try {
      await api(`/invitados/${inv.id}`, { method: "PATCH", body: { confirmacion } });
      await reload();
    } catch (e) {
      setAviso((e as ApiError).message);
    }
  }

  async function eliminar(inv: Invitado) {
    if (!window.confirm(`¿Eliminar a ${inv.nombre} de la lista de invitados?`)) return;
    setAviso(null);
    try {
      await api(`/invitados/${inv.id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setAviso((e as ApiError).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {ORDEN.map((e) => (
          <div key={e} className={cx("flex flex-col gap-1 rounded-[10px] p-5 text-white", CARD[e])}>
            <span className="text-[11px] text-white/70">{PLURAL[e]}</span>
            <span className="text-[28px] leading-10 font-medium">{cuenta(e)}</span>
          </div>
        ))}
      </div>

      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}

      <div className="flex justify-end">
        <Button icon={Plus} onClick={() => setEditando("nuevo")}>Agregar invitado</Button>
      </div>

      {data.length ? (
        <Card className="overflow-x-auto shadow-none">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.3px] text-black/60 uppercase">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Mesa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data.map((inv) => (
                <tr key={inv.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {inv.nombre}
                    {inv.acompanantes ? <span className="font-normal text-black/50"> +{inv.acompanantes}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-black/60">{inv.correo ?? "—"}</td>
                  <td className="px-4 py-2.5 text-black/60">{inv.mesa ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <label className="sr-only" htmlFor={`rsvp-${inv.id}`}>Estado de {inv.nombre}</label>
                    <div className="relative w-fit">
                      <StatusPill tone={TONO[inv.confirmacion]}>{ESTADO_RSVP[inv.confirmacion]}</StatusPill>
                      <select
                        id={`rsvp-${inv.id}`}
                        value={inv.confirmacion}
                        onChange={(e) => void cambiarEstado(inv, e.target.value as EstadoRSVP)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      >
                        {ORDEN.map((e) => <option key={e} value={e}>{ESTADO_RSVP[e]}</option>)}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Editar ${inv.nombre}`} onClick={() => setEditando(inv)} />
                      <Button size="sm" variant="danger" icon={Trash2} aria-label={`Eliminar ${inv.nombre}`} onClick={() => void eliminar(inv)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Empty title="Aún no hay invitados">
          <Button icon={Plus} onClick={() => setEditando("nuevo")}>Agregar el primer invitado</Button>
        </Empty>
      )}

      <InvitadoModal
        bodaId={bodaId}
        invitado={editando}
        onClose={() => setEditando(null)}
        onSaved={async () => {
          setEditando(null);
          await reload();
        }}
      />
    </div>
  );
}

function InvitadoModal({
  bodaId,
  invitado,
  onClose,
  onSaved,
}: {
  bodaId: string;
  invitado: Invitado | "nuevo" | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const nuevo = invitado === "nuevo";
  const [form, setForm] = useState<Form>(VACIO);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [abiertoPara, setAbiertoPara] = useState<Invitado | "nuevo" | null>(null);

  // Carga el formulario cuando se abre para otro invitado
  if (invitado !== abiertoPara) {
    setAbiertoPara(invitado);
    setErr(null);
    setForm(
      invitado && invitado !== "nuevo"
        ? {
            nombre: invitado.nombre,
            correo: invitado.correo ?? "",
            telefono: invitado.telefono ?? "",
            mesa: invitado.mesa ?? "",
            acompanantes: String(invitado.acompanantes),
            confirmacion: invitado.confirmacion,
          }
        : VACIO,
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = { ...form, acompanantes: Number(form.acompanantes) || 0 };
    try {
      if (nuevo) await api(`/bodas/${bodaId}/invitados`, { method: "POST", body });
      else if (invitado) await api(`/invitados/${invitado.id}`, { method: "PATCH", body });
      await onSaved();
    } catch (e2) {
      setErr(e2 as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open={invitado !== null} onClose={onClose} title={nuevo ? "Agregar invitado" : "Editar invitado"} description="Registra a quién esperas y en qué mesa se sentará">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {err && !err.errores.length ? <Notice tone="danger">{err.message}</Notice> : null}
        <TextField label="Nombre *" icon={User} value={form.nombre} onChange={set("nombre")} error={err?.campo("nombre")} maxLength={150} autoFocus />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Correo" icon={Mail} type="email" value={form.correo} onChange={set("correo")} error={err?.campo("correo")} />
          <TextField label="Teléfono" icon={Phone} inputMode="numeric" maxLength={10} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "") })} error={err?.campo("telefono")} hint="10 dígitos" />
          <TextField label="Mesa" placeholder="Mesa 1" value={form.mesa} onChange={set("mesa")} error={err?.campo("mesa")} maxLength={50} />
          <TextField label="Acompañantes" icon={Users} type="number" min={0} max={20} value={form.acompanantes} onChange={set("acompanantes")} error={err?.campo("acompanantes")} />
        </div>
        <SelectField label="Estado" value={form.confirmacion} onChange={set("confirmacion")}>
          {ORDEN.map((e) => <option key={e} value={e}>{ESTADO_RSVP[e]}</option>)}
        </SelectField>
        <ModalActions onCancel={onClose} submitLabel={nuevo ? "Guardar invitado" : "Guardar cambios"} busy={busy} disabled={!form.nombre.trim()} />
      </form>
    </Modal>
  );
}
