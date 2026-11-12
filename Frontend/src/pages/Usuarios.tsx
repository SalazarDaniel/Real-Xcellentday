import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, api } from '../api/client'
import type { Rol, Usuario } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Badge, Loading, Notice, PageHeader, SelectField, TextField } from '../components/ui'
import { fecha } from '../lib/format'
import { useApi } from '../lib/useApi'

const VACIO = {
  nombre_completo: '',
  correo: '',
  password: '',
  password_confirmacion: '',
  rol: 'WEDDING_PLANNER' as Rol,
}

export default function Usuarios() {
  const { user } = useAuth()
  const { data, loading, reload } = useApi<Usuario[]>('/usuarios')
  const [form, setForm] = useState(VACIO)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const set = (k: keyof typeof VACIO) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function crear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api('/usuarios', { method: 'POST', body: form })
      setOk('Cuenta creada correctamente')
      setForm(VACIO) // RF01 3b: si falla, el formulario conserva los datos
      setAbierto(false)
      await reload()
    } catch (err) {
      setError(err as ApiError)
    }
  }

  async function cambiar(u: Usuario, cambios: Partial<Pick<Usuario, 'rol' | 'activo'>>) {
    setOk(null)
    try {
      await api(`/usuarios/${u.id}`, { method: 'PATCH', body: cambios })
      await reload()
    } catch (err) {
      setError(err as ApiError)
    }
  }

  return (
    <>
      <PageHeader
        title="Usuarios"
        sub="Da de alta las cuentas del equipo y asigna su rol."
        actions={
          !abierto && (
            <button className="btn btn--primary" onClick={() => (setAbierto(true), setOk(null))}>
              Nueva cuenta
            </button>
          )
        }
      />
      {ok ? <Notice tone="success">{ok}</Notice> : null}
      {error && !abierto ? <Notice tone="danger">{error.message}</Notice> : null}

      {abierto && (
        <form className="panel form-grid" onSubmit={crear} noValidate>
          <h2 className="panel__title span-2">Nueva cuenta</h2>
          {error && !error.errores.length ? (
            <div className="span-2">
              <Notice tone="danger">{error.message}</Notice>
            </div>
          ) : null}
          <TextField
            label="Nombre completo"
            maxLength={100}
            value={form.nombre_completo}
            onChange={set('nombre_completo')}
            error={error?.campo('nombre_completo')}
          />
          <TextField
            label="Correo electrónico"
            type="email"
            value={form.correo}
            onChange={set('correo')}
            error={error?.campo('correo')}
          />
          <TextField
            label="Contraseña inicial"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            hint="Mínimo 8 caracteres, una mayúscula y un número."
            error={error?.campo('password')}
          />
          <TextField
            label="Confirma la contraseña"
            type="password"
            autoComplete="new-password"
            value={form.password_confirmacion}
            onChange={set('password_confirmacion')}
            error={error?.errores.find((x) => x.campo === '')?.mensaje}
          />
          <SelectField label="Rol" value={form.rol} onChange={set('rol')}>
            <option value="WEDDING_PLANNER">Wedding planner</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </SelectField>
          <div className="form-actions span-2">
            <button type="button" className="btn" onClick={() => (setAbierto(false), setError(null))}>
              Cancelar
            </button>
            <button className="btn btn--primary">Crear cuenta</button>
          </div>
        </form>
      )}

      {loading && !data ? (
        <Loading />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Registro</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => {
                const yo = u.id === user?.id
                return (
                  <tr key={u.id} className={u.activo ? '' : 'row--muted'}>
                    <td>
                      {u.nombre_completo}
                      {yo ? <span className="muted"> (tú)</span> : null}
                    </td>
                    <td>{u.correo}</td>
                    <td>
                      <select
                        aria-label={`Rol de ${u.nombre_completo}`}
                        value={u.rol}
                        disabled={yo}
                        onChange={(e) => void cambiar(u, { rol: e.target.value as Rol })}
                      >
                        <option value="WEDDING_PLANNER">Wedding planner</option>
                        <option value="ADMINISTRADOR">Administrador</option>
                      </select>
                    </td>
                    <td>
                      <Badge tone={u.activo ? 'ok' : 'muted'}>{u.activo ? 'Activa' : 'Inactiva'}</Badge>
                    </td>
                    <td>{fecha(u.fecha_registro)}</td>
                    <td className="cell-actions">
                      {!yo && (
                        <button className="link-button" onClick={() => void cambiar(u, { activo: !u.activo })}>
                          {u.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
