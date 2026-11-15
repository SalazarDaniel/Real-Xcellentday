"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { EllipsisVertical, Mail, Phone, Plus, Search, User } from "lucide-react";
import { SERVICIO, ServicioBadge, ServicioIcon } from "@/components/servicio";
import { Button, Empty, Loading, Modal, ModalActions, Notice, PageHeader, SelectField, TextAreaField, TextField, cx } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { TIPO_SERVICIO, telefono } from "@/lib/format";
import type { Proveedor, TipoServicio } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Form = { nombre: string; tipo_servicio: TipoServicio | ""; nombre_contacto: string; telefono: string; correo: string; notas: string };
const VACIO: Form = { nombre: "", tipo_servicio: "", nombre_contacto: "", telefono: "", correo: "", notas: "" };
type Aviso = { tone: "success" | "warning" | "danger"; text: string; desactivar?: Proveedor };

export default function ProveedoresView() {
  const { data, loading, error, reload } = useApi<Proveedor[]>("/proveedores");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<TipoServicio | "">("");
  const [editando, setEditando] = useState<Proveedor | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const todos = data ?? [];
  const term = q.trim().toLowerCase();
  // Búsqueda local: nombre, contacto o cliente asignado (como indica el diseño)
  const lista = todos.filter(
    (p) =>
      (!tipo || p.tipo_servicio === tipo) &&
      (!term ||
        p.nombre.toLowerCase().includes(term) ||
        (p.nombre_contacto ?? "").toLowerCase().includes(term) ||
        p.clientes.some((c) => c.toLowerCase().includes(term))),
  );

  async function activo(p: Proveedor, activar: boolean) {
    try {
      await api(`/proveedores/${p.id}/${activar ? "activar" : "desactivar"}`, { method: "PATCH" });
      setAviso({ tone: "success", text: activar ? `${p.nombre} está activo de nuevo` : `${p.nombre} fue desactivado` });
      await reload();
    } catch (e) {
      setAviso({ tone: "danger", text: (e as ApiError).message });
    }
  }

  async function eliminar(p: Proveedor) {
    if (!window.confirm(`¿Eliminar a ${p.nombre} del catálogo?`)) return;
    try {
      await api(`/proveedores/${p.id}`, { method: "DELETE" });
      setAviso({ tone: "success", text: `${p.nombre} fue eliminado` });
      await reload();
    } catch (e) {
      const ae = e as ApiError;
      // RF06 5a: si tiene relaciones, se ofrece desactivarlo
      setAviso({ tone: "warning", text: ae.message, desactivar: ae.status === 409 ? p : undefined });
    }
  }

  return (
    <>
      <PageHeader
        title="Gestión de Proveedores"
        sub="Administra tu red de proveedores y contratistas"
        actions={<Button icon={Plus} onClick={() => { setAviso(null); setEditando("nuevo"); }}>Agregar proveedor</Button>}
      />

      <section aria-label="Resumen" className="grid gap-4 font-inter sm:grid-cols-3">
        {[
          ["Total de Proveedores", todos.length],
          ["Tipos de Servicios", new Set(todos.map((p) => p.tipo_servicio)).size],
          ["Activos en Eventos", todos.filter((p) => p.clientes.length).length],
        ].map(([l, v]) => (
          <div key={l} className="flex flex-col gap-1 rounded-[10px] border border-line bg-canvas p-5">
            <span className="text-[13px] tracking-[0.2px] text-black/60">{l}</span>
            <span className="text-[28px] leading-[42px] font-semibold">{data ? v : "—"}</span>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-4 font-inter sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="buscar-prov" className="sr-only">Buscar proveedor</label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-placeholder" aria-hidden />
          <input
            id="buscar-prov"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, contacto o cliente..."
            className="h-9 w-full rounded-[10px] border border-black/20 bg-white pr-3 pl-10 text-sm outline-none placeholder:text-placeholder focus:border-black"
          />
        </div>
        <label htmlFor="tipo-prov" className="sr-only">Filtrar por servicio</label>
        <select
          id="tipo-prov"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoServicio | "")}
          className="h-9 rounded-[10px] border border-black/20 bg-white px-3 text-sm sm:w-56"
        >
          <option value="">Todos los servicios</option>
          {Object.entries(TIPO_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {aviso ? (
        <Notice tone={aviso.tone}>
          {aviso.text}
          {aviso.desactivar ? (
            <> <button className="font-medium underline" onClick={() => void activo(aviso.desactivar!, false)}>Desactivar proveedor</button></>
          ) : null}
        </Notice>
      ) : null}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}

      {loading && !data ? (
        <Loading />
      ) : lista.length ? (
        <>
          <section aria-label="Proveedores" className="grid gap-4 font-inter md:grid-cols-2 xl:grid-cols-3">
            {lista.map((p) => (
              <ProveedorCard key={p.id} p={p} onEdit={() => { setAviso(null); setEditando(p); }} onToggle={() => void activo(p, !p.activo)} onDelete={() => void eliminar(p)} />
            ))}
          </section>
          <p className="text-[13px] text-black/50">Mostrando {lista.length} de {todos.length} proveedores</p>
        </>
      ) : (
        <Empty title={tipo || term ? "Ningún proveedor coincide" : "Tu catálogo está vacío"}>
          {!tipo && !term && <Button icon={Plus} onClick={() => setEditando("nuevo")}>Registrar el primer proveedor</Button>}
        </Empty>
      )}

      <ProveedorModal
        proveedor={editando}
        onClose={() => setEditando(null)}
        onSaved={async (msg) => {
          setEditando(null);
          setAviso({ tone: "success", text: msg });
          await reload();
        }}
      />
    </>
  );
}

function ProveedorCard({ p, onEdit, onToggle, onDelete }: { p: Proveedor; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const dato = (Icon: typeof User, label: string, value: string | null, strong = false) => (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-black/50" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.3px] text-black/50 uppercase">{label}</p>
        <p className={cx("truncate text-[13px]", strong ? "font-medium" : "text-black/70")}>{value || "—"}</p>
      </div>
    </div>
  );
  return (
    <article className={cx("relative overflow-hidden rounded-[10px] border border-line bg-white", !p.activo && "opacity-60")}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: SERVICIO[p.tipo_servicio].bar }} aria-hidden />
      <div className="flex flex-col gap-3 border-b border-line bg-canvas p-5">
        <div className="flex items-start justify-between">
          <ServicioIcon tipo={p.tipo_servicio} />
          <CardMenu nombre={p.nombre} activo={p.activo} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} />
        </div>
        <h3 className="text-base font-semibold tracking-[-0.16px]">{p.nombre}</h3>
        <div className="flex items-center gap-2">
          <ServicioBadge tipo={p.tipo_servicio} />
          {!p.activo ? <span className="text-[11px] text-black/50">Inactivo</span> : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 p-5">
        {dato(User, "Contacto", p.nombre_contacto, true)}
        {dato(Phone, "Teléfono", telefono(p.telefono))}
        {dato(Mail, "Correo", p.correo)}
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <p className="text-[11px] tracking-[0.3px] text-black/50 uppercase">Cliente asignado</p>
          <p className="text-[13px] font-medium">{p.clientes.length ? p.clientes.join(", ") : <span className="font-normal text-black/50">Sin asignar</span>}</p>
        </div>
      </div>
    </article>
  );
}

function CardMenu({ nombre, activo, onEdit, onToggle, onDelete }: { nombre: string; activo: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const item = "block w-full rounded-md px-3 py-2 text-left text-[13px] hover:bg-black/5";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Acciones para ${nombre}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-black/5">
        <EllipsisVertical className="size-4" aria-hidden />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-[10px] border border-black/10 bg-white p-1 shadow-lg">
          <button className={item} onClick={() => { setOpen(false); onEdit(); }}>Editar</button>
          <button className={item} onClick={() => { setOpen(false); onToggle(); }}>{activo ? "Desactivar" : "Activar"}</button>
          <button className={cx(item, "text-rose-700")} onClick={() => { setOpen(false); onDelete(); }}>Eliminar</button>
        </div>
      ) : null}
    </div>
  );
}

function ProveedorModal({ proveedor, onClose, onSaved }: { proveedor: Proveedor | "nuevo" | null; onClose: () => void; onSaved: (msg: string) => Promise<void> }) {
  const nuevo = proveedor === "nuevo";
  const [form, setForm] = useState<Form>(VACIO);
  const [err, setErr] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [abiertoPara, setAbiertoPara] = useState<Proveedor | "nuevo" | null>(null);

  if (proveedor !== abiertoPara) {
    setAbiertoPara(proveedor);
    setErr(null);
    setForm(
      proveedor && proveedor !== "nuevo"
        ? {
            nombre: proveedor.nombre,
            tipo_servicio: proveedor.tipo_servicio,
            nombre_contacto: proveedor.nombre_contacto ?? "",
            telefono: proveedor.telefono ?? "",
            correo: proveedor.correo ?? "",
            notas: proveedor.notas ?? "",
          }
        : VACIO,
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const body = { ...form, tipo_servicio: form.tipo_servicio || null };
    try {
      if (nuevo) await api("/proveedores", { method: "POST", body });
      else if (proveedor) await api(`/proveedores/${proveedor.id}`, { method: "PUT", body });
      await onSaved(nuevo ? "Proveedor registrado" : "Cambios guardados");
    } catch (e2) {
      setErr(e2 as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal
      open={proveedor !== null}
      onClose={onClose}
      width="max-w-[500px]"
      title={nuevo ? "Agregar Nuevo Proveedor" : "Editar Proveedor"}
      description={nuevo ? "Completa la información del proveedor que deseas registrar" : undefined}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 [&_input]:h-10 [&_label]:text-[13px] [&_select]:h-10">
        {err && !err.errores.length ? <Notice tone="danger">{err.message}</Notice> : null}
        <SelectField label="Tipo de proveedor *" value={form.tipo_servicio} onChange={set("tipo_servicio")} error={err?.campo("tipo_servicio")}>
          <option value="">Selecciona un tipo</option>
          {Object.entries(TIPO_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        <TextField label="Nombre del proveedor *" placeholder="Ej: Fotografía Momentos" value={form.nombre} onChange={set("nombre")} error={err?.campo("nombre")} />
        <TextField label="Nombre del contacto" placeholder="Ej: Juan Pérez" value={form.nombre_contacto} onChange={set("nombre_contacto")} error={err?.campo("nombre_contacto")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Teléfono" placeholder="5512345678" inputMode="numeric" maxLength={10} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, "") })} error={err?.campo("telefono")} />
          <TextField label="Correo electrónico" type="email" placeholder="contacto@ejemplo.com" value={form.correo} onChange={set("correo")} error={err?.campo("correo")} />
        </div>
        <TextAreaField label="Notas o detalles adicionales" placeholder="Información adicional sobre el proveedor..." value={form.notas} onChange={set("notas")} />
        <ModalActions onCancel={onClose} submitLabel={nuevo ? "Guardar proveedor" : "Guardar cambios"} busy={busy} />
      </form>
    </Modal>
  );
}
