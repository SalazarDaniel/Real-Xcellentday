"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Card, Loading, Modal, ModalActions, Notice, PageHeader, SelectField, TextField } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fecha } from "@/lib/format";
import type { Rol, Usuario } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const VACIO = { nombre_completo: "", correo: "", password: "", password_confirmacion: "", rol: "WEDDING_PLANNER" as Rol };
const ROLES: Record<Rol, string> = { WEDDING_PLANNER: "Wedding planner", ADMINISTRADOR: "Administrador" };

export default function UsuariosView() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<Usuario[]>("/usuarios");
  const [form, setForm] = useState(VACIO);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof VACIO) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api("/usuarios", { method: "POST", body: form });
      setOk("Cuenta creada correctamente");
      setForm(VACIO); // RF01 3b: si falla, el formulario conserva los datos
      setAbierto(false);
      await reload();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function cambiar(u: Usuario, cambios: Partial<Pick<Usuario, "rol" | "activo">>) {
    setOk(null);
    setError(null);
    try {
      await api(`/usuarios/${u.id}`, { method: "PATCH", body: cambios });
      await reload();
    } catch (err) {
      setError(err as ApiError);
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        sub="Da de alta las cuentas del equipo y asigna su rol"
        actions={<Button icon={Plus} onClick={() => { setOk(null); setError(null); setAbierto(true); }}>Nueva cuenta</Button>}
      />
      {ok ? <Notice tone="success">{ok}</Notice> : null}
      {error && !abierto ? <Notice tone="danger">{error.message}</Notice> : null}

      {loading && !data ? (
        <Loading />
      ) : (
        <Card className="overflow-x-auto shadow-none">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] tracking-[0.3px] text-black/60 uppercase">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Registro</th>
                <th className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => {
                const yo = u.id === user?.id;
                return (
                  <tr key={u.id} className={u.activo ? "border-b border-line last:border-0" : "border-b border-line text-black/40 last:border-0"}>
                    <td className="px-4 py-2.5 font-medium">{u.nombre_completo}{yo ? <span className="font-normal text-black/50"> (tú)</span> : null}</td>
                    <td className="px-4 py-2.5">{u.correo}</td>
                    <td className="px-4 py-2.5">
                      <select aria-label={`Rol de ${u.nombre_completo}`} value={u.rol} disabled={yo} onChange={(e) => void cambiar(u, { rol: e.target.value as Rol })} className="h-9 rounded-lg border border-black/20 bg-white px-2 disabled:bg-transparent">
                        {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={u.activo ? "bg-sage/20 text-[#3e5546]" : undefined}>{u.activo ? "Activa" : "Inactiva"}</Badge>
                    </td>
                    <td className="px-4 py-2.5">{fecha(u.fecha_registro)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {!yo && (
                        <Button size="sm" variant={u.activo ? "danger" : "outline"} onClick={() => void cambiar(u, { activo: !u.activo })}>
                          {u.activo ? "Desactivar" : "Reactivar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={abierto} onClose={() => { setAbierto(false); setError(null); }} title="Nueva cuenta" description="La persona podrá iniciar sesión con este correo y contraseña">
        <form onSubmit={crear} noValidate className="flex flex-col gap-5">
          {error && !error.errores.length ? <Notice tone="danger">{error.message}</Notice> : null}
          <TextField label="Nombre completo" maxLength={100} value={form.nombre_completo} onChange={set("nombre_completo")} error={error?.campo("nombre_completo")} />
          <TextField label="Correo electrónico" type="email" value={form.correo} onChange={set("correo")} error={error?.campo("correo")} />
          <TextField label="Contraseña inicial" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} hint="Mínimo 8 caracteres, una mayúscula y un número." error={error?.campo("password")} />
          <TextField label="Confirma la contraseña" type="password" autoComplete="new-password" value={form.password_confirmacion} onChange={set("password_confirmacion")} error={error?.errores.find((x) => x.campo === "")?.mensaje} />
          <SelectField label="Rol" value={form.rol} onChange={set("rol")}>
            {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </SelectField>
          <ModalActions onCancel={() => { setAbierto(false); setError(null); }} submitLabel="Crear cuenta" busy={busy} />
        </form>
      </Modal>
    </>
  );
}
