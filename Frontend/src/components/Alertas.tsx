import { Link } from 'react-router-dom'
import type { AlertaPago } from '../api/types'
import { diasTexto, fecha, money } from '../lib/format'

/** Lista de alertas de pagos (RF08): amarillo = vence en ≤ 7 días, rojo = vencido. */
export function AlertasPagos({ alertas, mostrarPareja = true }: { alertas: AlertaPago[]; mostrarPareja?: boolean }) {
  if (!alertas.length) return <p className="muted">No hay pagos por vencer en los próximos 7 días.</p>
  return (
    <ul className="alerts">
      {alertas.map((a) => (
        <li key={a.pago_id} className={`alert alert--${a.nivel}`}>
          <span className="alert__dot" aria-hidden="true" />
          <div className="alert__body">
            <p className="alert__title">
              {a.concepto}
              {mostrarPareja ? (
                <>
                  {' '}
                  <span className="muted">para</span>{' '}
                  <Link to={`/bodas/${a.boda_id}/presupuesto`}>{a.pareja}</Link>
                </>
              ) : null}
            </p>
            <p className="alert__meta">
              {a.nivel === 'rojo' ? 'Venció' : 'Vence'} {diasTexto(a.dias)}, {fecha(a.fecha_vencimiento)}
            </p>
          </div>
          <span className="alert__amount">{money(a.monto)}</span>
        </li>
      ))}
    </ul>
  )
}
