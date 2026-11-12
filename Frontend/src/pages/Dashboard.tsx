import { Link } from 'react-router-dom'
import type { Dashboard as DashboardData } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { AlertasPagos } from '../components/Alertas'
import { Empty, Loading, Notice, PageHeader } from '../components/ui'
import { fecha, money } from '../lib/format'
import { useApi } from '../lib/useApi'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, loading } = useApi<DashboardData>('/dashboard')
  const nombre = user?.nombre_completo.split(' ')[0]

  if (loading && !data) return <Loading />
  if (error || !data) return <Notice tone="danger">{error?.message}</Notice>

  const f = data.finanzas
  const pct = f.monto_comprometido ? Math.round((f.monto_pagado / f.monto_comprometido) * 100) : 0

  return (
    <>
      <PageHeader
        title={`Hola, ${nombre}`}
        sub={new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        actions={
          <Link className="btn btn--primary" to="/bodas/nueva">
            Nueva boda
          </Link>
        }
      />

      <section className="kpis" aria-label="Indicadores">
        <Link to="/bodas?estado=ACTIVA" className="kpi">
          <span className="kpi__value">{data.bodas_activas}</span>
          <span className="kpi__label">Bodas activas</span>
        </Link>
        <Link to="/bodas?proximos=30" className="kpi">
          <span className="kpi__value">{data.bodas_proximos_30_dias}</span>
          <span className="kpi__label">En los próximos 30 días</span>
        </Link>
        <Link to="/tareas?estado=PENDIENTE" className="kpi">
          <span className="kpi__value">{data.tareas_pendientes}</span>
          <span className="kpi__label">Tareas pendientes</span>
        </Link>
        <Link to="/tareas?vencidas=1" className={`kpi${data.tareas_vencidas ? ' kpi--danger' : ''}`}>
          <span className="kpi__value">{data.tareas_vencidas}</span>
          <span className="kpi__label">Tareas vencidas</span>
        </Link>
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Pagos por atender</h2>
            <span className="muted small">
              {data.pagos_vencidos} vencidos, {data.pagos_proximos} esta semana
            </span>
          </div>
          <AlertasPagos alertas={data.alertas_pagos} />
        </section>

        <section className="panel">
          <h2 className="panel__title">Finanzas de tus bodas activas</h2>
          <div className="finance">
            <div className="finance__bar" role="img" aria-label={`Pagado ${pct}% de lo comprometido`}>
              <span style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <dl className="finance__list">
              <div>
                <dt>Presupuesto total</dt>
                <dd>{money(f.monto_total)}</dd>
              </div>
              <div>
                <dt>Comprometido</dt>
                <dd>{money(f.monto_comprometido)}</dd>
              </div>
              <div>
                <dt>Pagado</dt>
                <dd>
                  {money(f.monto_pagado)} <span className="muted small">({pct}%)</span>
                </dd>
              </div>
              <div>
                <dt>Saldo pendiente</dt>
                <dd>{money(f.saldo_pendiente)}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Próximas bodas</h2>
          <Link to="/bodas" className="small">
            Ver todas
          </Link>
        </div>
        {data.proximas_bodas.length ? (
          <ul className="upcoming">
            {data.proximas_bodas.map((b) => (
              <li key={b.id}>
                <Link to={`/bodas/${b.id}`} className="upcoming__item">
                  <span className="upcoming__days">
                    <strong>{b.dias_restantes}</strong> días
                  </span>
                  <span className="upcoming__name">{b.pareja?.nombre}</span>
                  <span className="muted">
                    {fecha(b.fecha, { month: 'long' })}, {b.lugar}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Todavía no tienes bodas activas">
            <Link to="/bodas/nueva" className="btn btn--primary">
              Registrar la primera boda
            </Link>
          </Empty>
        )}
      </section>
    </>
  )
}
