import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { Expediente as ExpedienteData, Proveedor } from '../api/types'
import { AlertasPagos } from '../components/Alertas'
import { BodaHeader } from '../components/BodaHeader'
import { Badge, Loading, Notice } from '../components/ui'
import { ESTADO_TAREA, PRIORIDAD, TIPO_SERVICIO, fecha, money } from '../lib/format'
import { useApi } from '../lib/useApi'

export default function Expediente() {
  const { id } = useParams()
  const location = useLocation()
  const { data, error, loading, reload } = useApi<ExpedienteData>(`/bodas/${id}/expediente`)
  const catalogo = useApi<Proveedor[]>('/proveedores?activo=true')
  const [proveedorSel, setProveedorSel] = useState('')
  const [accionError, setAccionError] = useState<string | null>(null)
  const message = (location.state as { message?: string } | null)?.message

  if (loading && !data) return <Loading />
  if (error || !data) return <Notice tone="danger">{error?.status === 403 ? 'No tienes acceso a esta boda.' : error?.message}</Notice>

  const { boda, presupuesto: p, tareas, invitados } = data
  const contratados = new Set(data.proveedores.map((x) => x.id))
  const disponibles = (catalogo.data ?? []).filter((x) => !contratados.has(x.id))

  async function asociar(proveedorId: string, quitar = false) {
    setAccionError(null)
    try {
      await api(`/bodas/${boda.id}/proveedores/${proveedorId}`, { method: quitar ? 'DELETE' : 'POST' })
      setProveedorSel('')
      await reload()
    } catch (e) {
      setAccionError((e as ApiError).message)
    }
  }

  return (
    <>
      <BodaHeader boda={boda} />
      {message ? <Notice tone="success">{message}</Notice> : null}

      <div className="dossier">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Presupuesto</h2>
            <Link to={`/bodas/${boda.id}/presupuesto`} className="small">
              Editar
            </Link>
          </div>
          {p ? (
            <>
              <dl className="figures">
                <div>
                  <dt>Total</dt>
                  <dd>{money(p.monto_total)}</dd>
                </div>
                <div>
                  <dt>Comprometido</dt>
                  <dd>{money(p.monto_comprometido)}</dd>
                </div>
                <div>
                  <dt>Pagado</dt>
                  <dd>{money(p.monto_pagado)}</dd>
                </div>
                <div>
                  <dt>Saldo pendiente</dt>
                  <dd>{money(p.saldo_pendiente)}</dd>
                </div>
              </dl>
              {p.excedido ? <Notice tone="warning">Los conceptos superan el presupuesto total.</Notice> : null}
            </>
          ) : null}
          <h3 className="panel__subtitle">Pagos por atender</h3>
          <AlertasPagos alertas={data.alertas_pagos} mostrarPareja={false} />
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Tareas</h2>
            <Link to={`/bodas/${boda.id}/tareas`} className="small">
              Editar
            </Link>
          </div>
          <p className="counts">
            <span>
              <strong>{tareas.pendientes}</strong> pendientes
            </span>
            <span>
              <strong>{tareas.en_proceso}</strong> en proceso
            </span>
            <span>
              <strong>{tareas.completadas}</strong> completadas
            </span>
            {tareas.vencidas ? (
              <span className="text-danger">
                <strong>{tareas.vencidas}</strong> vencidas
              </span>
            ) : null}
          </p>
          <ul className="mini-list">
            {tareas.lista
              .filter((t) => t.estado !== 'COMPLETADA')
              .slice(0, 6)
              .map((t) => (
                <li key={t.id} className={t.vencida ? 'is-overdue' : ''}>
                  <span>{t.titulo}</span>
                  <span className="muted small">
                    {fecha(t.fecha_limite)}, {PRIORIDAD[t.prioridad].toLowerCase()}, {ESTADO_TAREA[t.estado].toLowerCase()}
                  </span>
                </li>
              ))}
          </ul>
          {tareas.lista.length === 0 ? <p className="muted">Sin tareas registradas.</p> : null}
        </section>

        <section className="panel">
          <h2 className="panel__title">Pareja y evento</h2>
          <dl className="facts">
            <div>
              <dt>Contacto</dt>
              <dd>
                {boda.pareja?.correo}
                <br />
                {boda.pareja?.telefono}
              </dd>
            </div>
            <div>
              <dt>Estilo</dt>
              <dd>{boda.estilo}</dd>
            </div>
            <div>
              <dt>Invitados estimados</dt>
              <dd>{boda.invitados_estimados}</dd>
            </div>
            <div>
              <dt>Invitados registrados</dt>
              <dd>
                {invitados.total} ({invitados.confirmados} confirmados, {invitados.pendientes} pendientes)
              </dd>
            </div>
          </dl>
          {data.fechas_importantes.length ? (
            <>
              <h3 className="panel__subtitle">Fechas importantes</h3>
              <ul className="mini-list">
                {data.fechas_importantes.map((f) => (
                  <li key={f.id}>
                    <span>{f.titulo}</span>
                    <span className="muted small">{fecha(f.fecha)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Proveedores contratados</h2>
            <Link to="/proveedores" className="small">
              Catálogo
            </Link>
          </div>
          {accionError ? <Notice tone="danger">{accionError}</Notice> : null}
          {data.proveedores.length ? (
            <ul className="mini-list">
              {data.proveedores.map((pr) => (
                <li key={pr.id}>
                  <span>
                    {pr.nombre} <Badge tone="muted">{TIPO_SERVICIO[pr.tipo_servicio]}</Badge>
                  </span>
                  <button className="link-button small" onClick={() => void asociar(String(pr.id), true)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Aún no hay proveedores contratados.</p>
          )}
          {disponibles.length ? (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault()
                if (proveedorSel) void asociar(proveedorSel)
              }}
            >
              <label className="sr-only" htmlFor="prov-sel">
                Proveedor a contratar
              </label>
              <select id="prov-sel" value={proveedorSel} onChange={(e) => setProveedorSel(e.target.value)}>
                <option value="">Elige un proveedor del catálogo</option>
                {disponibles.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nombre} ({TIPO_SERVICIO[x.tipo_servicio]})
                  </option>
                ))}
              </select>
              <button className="btn" disabled={!proveedorSel}>
                Contratar
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </>
  )
}
