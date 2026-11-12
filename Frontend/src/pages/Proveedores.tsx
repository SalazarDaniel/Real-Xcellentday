import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, api } from '../api/client'
import type { Proveedor, TipoServicio } from '../api/types'
import { Badge, Empty, Loading, Notice, PageHeader, SelectField, TextAreaField, TextField } from '../components/ui'
import { TIPO_SERVICIO } from '../lib/format'
import { useApi } from '../lib/useApi'

type Form = {
  nombre: string
  tipo_servicio: TipoServicio | ''
  nombre_contacto: string
  telefono: string
  correo: string
  notas: string
}
const VACIO: Form = { nombre: '', tipo_servicio: '', nombre_contacto: '', telefono: '', correo: '', notas: '' }

export default function Proveedores() {
  const [tipo, setTipo] = useState('')
  const [q, setQ] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const qs = new URLSearchParams()
  if (tipo) qs.set('tipo_servicio', tipo)
  if (busqueda) qs.set('q', busqueda)
  const { data, loading, reload } = useApi<Proveedor[]>(`/proveedores?${qs}`)

  const [editando, setEditando] = useState<Proveedor | 'nuevo' | null>(null)
  const [form, setForm] = useState<Form>(VACIO)
  const [err, setErr] = useState<ApiError | null>(null)
  const [aviso, setAviso] = useState<{ tone: 'success' | 'warning' | 'danger'; text: string; desactivar?: Proveedor } | null>(null)

  function abrir(p: Proveedor | 'nuevo') {
    setEditando(p)
    setErr(null)
    setAviso(null)
    setForm(
      p === 'nuevo'
        ? VACIO
        : {
            nombre: p.nombre,
            tipo_servicio: p.tipo_servicio,
            nombre_contacto: p.nombre_contacto ?? '',
            telefono: p.telefono ?? '',
            correo: p.correo ?? '',
            notas: p.notas ?? '',
          },
    )
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const body = { ...form, tipo_servicio: form.tipo_servicio || null }
    try {
      if (editando === 'nuevo') await api('/proveedores', { method: 'POST', body })
      else if (editando) await api(`/proveedores/${editando.id}`, { method: 'PUT', body })
      setAviso({ tone: 'success', text: editando === 'nuevo' ? 'Proveedor registrado' : 'Cambios guardados' })
      setEditando(null)
      await reload()
    } catch (e2) {
      setErr(e2 as ApiError)
    }
  }

  async function activo(p: Proveedor, activar: boolean) {
    await api(`/proveedores/${p.id}/${activar ? 'activar' : 'desactivar'}`, { method: 'PATCH' })
    setAviso({ tone: 'success', text: activar ? `${p.nombre} está activo de nuevo` : `${p.nombre} fue desactivado` })
    await reload()
  }

  async function eliminar(p: Proveedor) {
    try {
      await api(`/proveedores/${p.id}`, { method: 'DELETE' })
      setAviso({ tone: 'success', text: `${p.nombre} fue eliminado` })
      await reload()
    } catch (e) {
      const ae = e as ApiError
      // RF06 5a: si tiene relaciones, se ofrece desactivarlo
      setAviso({ tone: 'warning', text: ae.message, desactivar: ae.status === 409 ? p : undefined })
    }
  }

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  return (
    <>
      <PageHeader
        title="Proveedores"
        sub="Tu catálogo de proveedores de confianza."
        actions={
          !editando && (
            <button className="btn btn--primary" onClick={() => abrir('nuevo')}>
              Nuevo proveedor
            </button>
          )
        }
      />
      {aviso ? (
        <Notice tone={aviso.tone}>
          {aviso.text}
          {aviso.desactivar ? (
            <>
              {' '}
              <button className="link-button" onClick={() => void activo(aviso.desactivar!, false)}>
                Desactivar proveedor
              </button>
            </>
          ) : null}
        </Notice>
      ) : null}

      {editando && (
        <form className="panel form-grid" onSubmit={guardar} noValidate>
          <h2 className="panel__title span-2">{editando === 'nuevo' ? 'Nuevo proveedor' : `Editar ${editando.nombre}`}</h2>
          {err && !err.errores.length ? (
            <div className="span-2">
              <Notice tone="danger">{err.message}</Notice>
            </div>
          ) : null}
          <TextField label="Nombre" value={form.nombre} onChange={set('nombre')} error={err?.campo('nombre')} />
          <SelectField label="Tipo de servicio" value={form.tipo_servicio} onChange={set('tipo_servicio')} error={err?.campo('tipo_servicio')}>
            <option value="">Elige un tipo</option>
            {Object.entries(TIPO_SERVICIO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SelectField>
          <TextField label="Nombre de contacto" value={form.nombre_contacto} onChange={set('nombre_contacto')} />
          <TextField label="Teléfono" inputMode="numeric" maxLength={10} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '') })} error={err?.campo('telefono')} hint="10 dígitos" />
          <TextField label="Correo" type="email" value={form.correo} onChange={set('correo')} error={err?.campo('correo')} />
          <TextAreaField label="Notas" value={form.notas} onChange={set('notas')} />
          <div className="form-actions span-2">
            <button type="button" className="btn" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="btn btn--primary">{editando === 'nuevo' ? 'Registrar proveedor' : 'Guardar cambios'}</button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filtrar por tipo de servicio">
          <button aria-pressed={tipo === ''} onClick={() => setTipo('')}>
            Todos
          </button>
          {Object.entries(TIPO_SERVICIO).map(([k, v]) => (
            <button key={k} aria-pressed={tipo === k} onClick={() => setTipo(k)}>
              {v}
            </button>
          ))}
        </div>
        <form className="search" role="search" onSubmit={(e) => (e.preventDefault(), setBusqueda(q.trim()))}>
          <label className="sr-only" htmlFor="buscar-prov">
            Buscar proveedor
          </label>
          <input id="buscar-prov" type="search" placeholder="Buscar por nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {loading && !data ? (
        <Loading />
      ) : data && data.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Servicio</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className={p.activo ? '' : 'row--muted'}>
                  <td>
                    <button className="link-button strong-link" onClick={() => abrir(p)}>
                      {p.nombre}
                    </button>
                  </td>
                  <td>{TIPO_SERVICIO[p.tipo_servicio]}</td>
                  <td>
                    {p.nombre_contacto ?? ''}
                    <p className="muted small">{[p.telefono, p.correo].filter(Boolean).join(', ')}</p>
                  </td>
                  <td>
                    <Badge tone={p.activo ? 'ok' : 'muted'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="cell-actions">
                    <button className="link-button small" onClick={() => void activo(p, !p.activo)}>
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="link-button small" onClick={() => void eliminar(p)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={tipo || busqueda ? 'Ningún proveedor coincide' : 'Tu catálogo está vacío'}>
          {!tipo && !busqueda && (
            <button className="btn btn--primary" onClick={() => abrir('nuevo')}>
              Registrar el primer proveedor
            </button>
          )}
        </Empty>
      )}
    </>
  )
}
