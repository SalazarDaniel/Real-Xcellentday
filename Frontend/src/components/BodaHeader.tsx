import { Link, NavLink } from 'react-router-dom'
import type { Boda } from '../api/types'
import { fecha } from '../lib/format'

/** Encabezado de una boda: la cuenta regresiva tratada como una invitación. */
export function BodaHeader({ boda }: { boda: Boda }) {
  const dias = boda.dias_restantes ?? 0
  const pareja = boda.pareja
  return (
    <>
      <p className="crumb">
        <Link to="/bodas">Bodas</Link>
      </p>
      <header className="invite">
        <div className="invite__names">
          <h1>
            <span>{pareja?.nombre_contrayente1}</span>
            <span className="invite__amp" aria-label="y">
              &amp;
            </span>
            <span>{pareja?.nombre_contrayente2}</span>
          </h1>
          <p className="invite__when">
            {fecha(boda.fecha, { weekday: 'long', month: 'long' })}
            <br />
            {boda.lugar}
          </p>
        </div>
        <div className="invite__count" aria-label={dias >= 0 ? `Faltan ${dias} días` : `Fue hace ${-dias} días`}>
          <span className="invite__num">{Math.abs(dias)}</span>
          <span className="invite__unit">
            {dias >= 0 ? (dias === 1 ? 'día para el sí' : 'días para el sí') : 'días desde la boda'}
          </span>
        </div>
      </header>
      <nav className="tabs" aria-label="Secciones de la boda">
        <NavLink to={`/bodas/${boda.id}`} end>
          Expediente
        </NavLink>
        <NavLink to={`/bodas/${boda.id}/presupuesto`}>Presupuesto y pagos</NavLink>
        <NavLink to={`/bodas/${boda.id}/tareas`}>Tareas</NavLink>
      </nav>
    </>
  )
}
