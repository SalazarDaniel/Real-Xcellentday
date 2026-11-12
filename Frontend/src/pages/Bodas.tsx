import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Boda, EstadoBoda } from '../api/types'
import { Badge, Empty, Loading, Notice, PageHeader } from '../components/ui'
import { ESTADO_BODA, fecha } from '../lib/format'
import { useApi } from '../lib/useApi'

const FILTROS: { valor: string; label: string }[] = [
  { valor: 'ACTIVA', label: 'Activas' },
  { valor: 'BORRADOR', label: 'Borradores' },
  { valor: 'REALIZADA', label: 'Realizadas' },
  { valor: '', label: 'Todas' },
]

const TONO: Record<EstadoBoda, string> = {
  ACTIVA: 'ok',
  BORRADOR: 'draft',
  REALIZADA: 'muted',
  CANCELADA: 'danger',
}

export default function Bodas() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? (params.get('proximos') ? '' : 'ACTIVA')
  const proximos = params.get('proximos')
  const [q, setQ] = useState(params.get('q') ?? '')

  const qs = new URLSearchParams()
  if (estado) qs.set('estado', estado)
  if (proximos) qs.set('proximos_dias', proximos)
  if (params.get('q')) qs.set('q', params.get('q')!)
  const { data, error, loading } = useApi<Boda[]>(`/bodas?${qs}`)

  function filtrar(valor: string) {
    const next = new URLSearchParams()
    next.set('estado', valor)
    if (q) next.set('q', q)
    setParams(next)
  }

  return (
    <>
      <PageHeader
        title="Bodas"
        sub={proximos ? `Bodas activas de los próximos ${proximos} días` : 'Tus parejas y sus eventos.'}
        actions={
          <Link className="btn btn--primary" to="/bodas/nueva">
            Nueva boda
          </Link>
        }
      />
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              aria-pressed={!proximos && estado === f.valor}
              onClick={() => filtrar(f.valor)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const next = new URLSearchParams(params)
            if (q) next.set('q', q)
            else next.delete('q')
            setParams(next)
          }}
        >
          <label className="sr-only" htmlFor="buscar-boda">
            Buscar boda
          </label>
          <input id="buscar-boda" type="search" placeholder="Buscar por nombre o lugar" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      {loading && !data ? (
        <Loading />
      ) : data && data.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pareja</th>
                <th>Fecha</th>
                <th>Lugar</th>
                <th>Invitados</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((b) => {
                const borrador = b.estado === 'BORRADOR'
                const nombre =
                  b.pareja?.nombre ??
                  ([b.datos_borrador?.pareja?.nombre_contrayente1, b.datos_borrador?.pareja?.nombre_contrayente2]
                    .filter(Boolean)
                    .join(' & ') ||
                    'Sin nombre todavía')
                return (
                  <tr key={b.id}>
                    <td>
                      <Link to={borrador ? `/bodas/nueva?borrador=${b.id}` : `/bodas/${b.id}`} className="strong-link">
                        {nombre}
                      </Link>
                    </td>
                    <td>
                      {fecha(b.fecha)}
                      {b.dias_restantes != null && b.dias_restantes >= 0 && !borrador ? (
                        <span className="muted small">, faltan {b.dias_restantes} días</span>
                      ) : null}
                    </td>
                    <td>{b.lugar ?? '—'}</td>
                    <td>{b.invitados_estimados ?? '—'}</td>
                    <td>
                      <Badge tone={TONO[b.estado]}>
                        {borrador ? `Borrador, paso ${b.paso_onboarding} de 3` : ESTADO_BODA[b.estado]}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={estado === 'BORRADOR' ? 'No tienes borradores' : 'No hay bodas con este filtro'}>
          <Link to="/bodas/nueva" className="btn btn--primary">
            Registrar una boda
          </Link>
        </Empty>
      )}
    </>
  )
}
