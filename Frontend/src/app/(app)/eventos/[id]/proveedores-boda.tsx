"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Phone, Plus, X } from "lucide-react";
import { ServicioIcon } from "@/components/servicio";
import { Button, Card, Empty, Notice } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { TIPO_SERVICIO, telefono } from "@/lib/format";
import type { Expediente, Proveedor } from "@/lib/types";
import { useApi } from "@/lib/use-api";

/** Proveedores contratados para la boda (RF06). */
export function ProveedoresTab({ expediente, onChange }: { expediente: Expediente; onChange: () => Promise<void> }) {
  const bodaId = expediente.boda.id;
  const catalogo = useApi<Proveedor[]>("/proveedores?activo=true");
  const [sel, setSel] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const contratados = new Set(expediente.proveedores.map((p) => p.id));
  const disponibles = (catalogo.data ?? []).filter((p) => !contratados.has(p.id));

  async function asociar(proveedorId: number | string, quitar = false) {
    setAviso(null);
    try {
      await api(`/bodas/${bodaId}/proveedores/${proveedorId}`, { method: quitar ? "DELETE" : "POST" });
      setSel("");
      await onChange();
    } catch (e) {
      setAviso((e as ApiError).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}
      {disponibles.length ? (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (sel) void asociar(sel);
          }}
        >
          <div className="flex min-w-[260px] flex-1 flex-col gap-2">
            <label htmlFor="prov-sel" className="text-sm font-medium">Contratar proveedor del catálogo</label>
            <select id="prov-sel" value={sel} onChange={(e) => setSel(e.target.value)} className="h-10 rounded-[10px] border border-black/20 bg-white px-3 text-sm">
              <option value="">Elige un proveedor</option>
              {disponibles.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({TIPO_SERVICIO[p.tipo_servicio]})</option>)}
            </select>
          </div>
          <Button icon={Plus} disabled={!sel}>Contratar</Button>
        </form>
      ) : null}

      {expediente.proveedores.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {expediente.proveedores.map((p) => (
            <Card key={p.id} className="flex items-start gap-4 p-5 font-inter">
              <ServicioIcon tipo={p.tipo_servicio} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{p.nombre}</p>
                <p className="text-xs text-black/50">{TIPO_SERVICIO[p.tipo_servicio]}{p.nombre_contacto ? ` · ${p.nombre_contacto}` : ""}</p>
                <div className="mt-2 flex flex-col gap-1 text-[13px] text-black/70">
                  {p.telefono ? <span className="flex items-center gap-2"><Phone className="size-3.5" aria-hidden />{telefono(p.telefono)}</span> : null}
                  {p.correo ? <span className="flex items-center gap-2"><Mail className="size-3.5" aria-hidden />{p.correo}</span> : null}
                </div>
              </div>
              <Button size="sm" variant="ghost" icon={X} aria-label={`Quitar ${p.nombre}`} onClick={() => void asociar(p.id, true)} />
            </Card>
          ))}
        </div>
      ) : (
        <Empty title="Aún no hay proveedores contratados">
          {!disponibles.length ? <Link href="/proveedores" className="text-sm underline">Agrega proveedores a tu catálogo</Link> : null}
        </Empty>
      )}
    </div>
  );
}
