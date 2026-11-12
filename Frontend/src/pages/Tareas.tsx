import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { Boda, EstadoTarea, PrioridadTarea, Tarea } from '../api/types'
import { BodaHeader } from '../components/BodaHeader'
import { Empty, Loading, Notice, PageHeader, SelectField, TextField } from '../components/ui'
import { ESTADO_TAREA, PRIORIDAD, fecha, hoyISO } from '../lib/format'
import { useApi } from '../lib/useApi'

const VACIA = { titulo: '', descripcion: '', fecha_limite: '', prioridad: 'MEDIA' as PrioridadTarea }

export default function Tareas() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? ''
  const prioridad = params.get('prioridad') ?? ''
  const vencidas = params.get('vencidas') === '1'

  const qs = new URLSearchParams()
  if (estado) qs.set('estado', estado)
  if (prioridad) qs.set('prioridad', prioridad)
  if (vencidas && !id) qs.set('vencidas', 'true')
  const base = id ? `/bodas/${id}/tareas` : '/tareas'
  const { data, error, loading, reload } = useApi<Tarea[]>(`${base}?${qs}`)
  const boda = useApi<Boda>(id ? `/bodas/${id}` : null)

  const [form, setForm] = useState(VACIA)
  const [formErr, setFormErr] = useState<ApiError | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function setFiltro(k: string, v: string) {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next)
  }

  async function crear(e: FormEvent | null, forzar = false) {
    e?.preventDefault()
    setFormErr(null)
    try {
      await api(`/bodas/${id}/tareas`, { method: 'POST', body: { ...form, descripcion: form.descripcion || null, confirmar: forzar } })
      setForm(VACIA)
      setConfirmar(null)
      await reload()
    } catch (err) {
      const ae = err as ApiError
      if (ae.code === 'FECHA_POSTERIOR_BODA') setConfirmar(ae.message)
      else setFormErr(ae)
    }
  }

  async function cambiarEstado(t: Tarea, nuevo: EstadoTarea) {
    setAviso(null)
    try {
      await api(`/tareas/${t.id}`, { method: 'PATCH', body: { estado: nuevo } })
      await reload()
    } catch (err) {
      setAviso((err as ApiError).message)
    }
  }

  async function eliminar(t: Tarea) {
    setAviso(null)
    try {
      await api(`/tareas/${t.id}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      setAviso((err as ApiError).message)
    }
  }

  return (
    <>
      {id ? (
        boda.data ? <BodaHeader boda={boda.data} /> : <Loading />
      ) : (
        <PageHeader title="Tareas" sub={vencidas ? 'Tareas vencidas de tus bodas activas' : 'Tareas de todas tus bodas activas.'} />
      )}

      {id && boda.data?.estado === 'ACTIVA' ? (
        <form className="panel form-grid form-grid--task" onSubmit={(e) => void crear(e)} noValidate>
          <h2 className="panel__title span-all">Nueva tarea</h2>
          <TextField label="Título" value={form.titulo} maxLength={150} onChange={(e) => setForm({ ...form, titulo: e.target.value })} error={formErr?.campo('titulo')} />
          <TextField label="Fecha límite" type="date" min={hoyISO()} value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} error={formErr?.campo('fecha_limite')} />
          <SelectField label="Prioridad" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value as PrioridadTarea })}>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </SelectField>
          <TextField label="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          {formErr && !formErr.errores.length ? (
            <div className="span-all">
              <Notice tone="danger">{formErr.message}</Notice>
            </div>
          ) : null}
          {confirmar ? (
            <div className="span-all">
              <Notice tone="warning">
                {confirmar}{' '}
                <button type="button" className="link-button" onClick={() => void crear(null, true)}>
                  Guardar de todos modos
                </button>
              </Notice>
            </div>
          ) : null}
          <div className="form-actions span-all">
            <button className="btn btn--primary" disabled={!form.titulo || !form.fecha_limite}>
              Agregar tarea
            </button>
          </div>
        </form>
      ) : null}

      <div className="toolbar">
        <div className="filters">
          <label>
            Estado
            <select value={estado} onChange={(e) => setFiltro('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="COMPLETADA">Completada</option>
            </select>
          </label>
          <label>
            Prioridad
            <select value={prioridad} onChange={(e) => setFiltro('prioridad', e.target.value)}>
              <option value="">Todas</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </label>
          {!id && (
            <label className="check">
              <input type="checkbox" checked={vencidas} onChange={(e) => setFiltro('vencidas', e.target.checked ? '1' : '')} />
              Solo vencidas
            </label>
          )}
        </div>
      </div>

      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {loading && !data ? (
        <Loading />
      ) : data && data.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tarea</th>
                {!id && <th>Boda</th>}
                <th>Fecha límite</th>
                <th>Prioridad</th>
                <th>Estado</th>
                {id && (
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className={t.vencida ? 'row--overdue' : t.estado === 'COMPLETADA' ? 'row--muted' : ''}>
                  <td>
                    {t.titulo}
                    {t.descripcion ? <p className="muted small">{t.descripcion}</p> : null}
                  </td>
                  {!id && (
                    <td>
                      <Link to={`/bodas/${t.boda_id}/tareas`}>{t.pareja}</Link>
                    </td>
                  )}
                  <td>
                    {fecha(t.fecha_limite)}
                    {t.vencida ? <span className="text-danger small"> vencida</span> : null}
                  </td>
                  <td>
                    <span className={`prio prio--${t.prioridad.toLowerCase()}`}>{PRIORIDAD[t.prioridad]}</span>
                  </td>
                  <td>
                    <select aria-label={`Estado de ${t.titulo}`} value={t.estado} onChange={(e) => void cambiarEstado(t, e.target.value as EstadoTarea)}>
                      {Object.entries(ESTADO_TAREA).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  {id && (
                    <td className="cell-actions">
                      <button className="link-button small" onClick={() => void eliminar(t)}>
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={estado || prioridad || vencidas ? 'Ninguna tarea coincide con el filtro' : 'Sin tareas por ahora'} />
      )}
    </>
  )
}
