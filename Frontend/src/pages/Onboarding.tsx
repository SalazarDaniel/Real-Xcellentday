import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { Boda, EventoForm, ParejaForm, PresupuestoForm } from '../api/types'
import { Loading, Notice, PageHeader, TextField } from '../components/ui'
import { fecha, hoyISO, money } from '../lib/format'

type Errors = Record<string, string>

const PAREJA0: ParejaForm = { nombre_contrayente1: '', nombre_contrayente2: '', correo: '', telefono: '' }
const EVENTO0: EventoForm = { fecha: '', lugar: '', estilo: '', invitados_estimados: '' }
const PRESUP0: PresupuestoForm = { monto_total: '', conceptos: [] }

const PASOS = ['Pareja', 'Evento', 'Presupuesto']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validarPareja(p: ParejaForm): Errors {
  const e: Errors = {}
  if (!p.nombre_contrayente1.trim()) e.nombre_contrayente1 = 'Escribe el nombre del primer contrayente'
  if (!p.nombre_contrayente2.trim()) e.nombre_contrayente2 = 'Escribe el nombre del segundo contrayente'
  if (!EMAIL.test(p.correo.trim())) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com'
  if (!/^\d{10}$/.test(p.telefono)) e.telefono = 'El teléfono debe tener 10 dígitos, sin espacios'
  return e
}

function validarEvento(ev: EventoForm): Errors {
  const e: Errors = {}
  if (!ev.fecha) e.fecha = 'Elige la fecha de la boda'
  else if (ev.fecha <= hoyISO()) e.fecha = 'La fecha de la boda debe ser futura'
  if (!ev.lugar.trim()) e.lugar = 'Escribe el lugar del evento'
  if (!ev.estilo.trim()) e.estilo = 'Describe el estilo, por ejemplo «Hacienda clásica»'
  const n = Number(ev.invitados_estimados)
  if (!Number.isInteger(n) || n < 1) e.invitados_estimados = 'Escribe un número de invitados mayor a cero'
  return e
}

function validarPresupuesto(p: PresupuestoForm): Errors {
  const e: Errors = {}
  if (!(Number(p.monto_total) > 0)) e.monto_total = 'El monto debe ser mayor a cero'
  p.conceptos.forEach((c, i) => {
    if (!c.descripcion.trim()) e[`c${i}d`] = 'Escribe el concepto o quítalo'
    if (!(Number(c.monto_acordado) > 0)) e[`c${i}m`] = 'El monto debe ser mayor a cero'
  })
  return e
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const borradorParam = params.get('borrador')
  const [borradorId, setBorradorId] = useState<number | null>(borradorParam ? Number(borradorParam) : null)
  const [cargando, setCargando] = useState(!!borradorParam)
  const [paso, setPaso] = useState(1) // 4 = revisión
  const [pareja, setPareja] = useState(PAREJA0)
  const [evento, setEvento] = useState(EVENTO0)
  const [presupuesto, setPresupuesto] = useState(PRESUP0)
  const [errors, setErrors] = useState<Errors>({})
  const [aviso, setAviso] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Retomar un borrador en el paso donde se quedó (RF04 CA3)
  useEffect(() => {
    if (!borradorParam) return
    api<Boda>(`/bodas/${borradorParam}`)
      .then((b) => {
        const d = b.datos_borrador ?? {}
        setPareja({ ...PAREJA0, ...(d.pareja ?? {}) })
        setEvento({ ...EVENTO0, ...(d.evento ?? {}) })
        setPresupuesto({ ...PRESUP0, ...(d.presupuesto ?? {}), conceptos: d.presupuesto?.conceptos ?? [] })
        setPaso(b.paso_onboarding)
      })
      .catch((e: ApiError) => setAviso({ tone: 'danger', text: e.message }))
      .finally(() => setCargando(false))
  }, [borradorParam])

  const validadores = [() => validarPareja(pareja), () => validarEvento(evento), () => validarPresupuesto(presupuesto)]

  function siguiente(e: FormEvent) {
    e.preventDefault()
    const errs = validadores[paso - 1]()
    setErrors(errs)
    setAviso(null)
    if (Object.keys(errs).length === 0) setPaso(paso + 1)
  }

  async function guardarBorrador() {
    setAviso(null)
    const body = { paso: Math.min(paso, 3), pareja, evento, presupuesto }
    try {
      const b = borradorId
        ? await api<Boda>(`/bodas/borradores/${borradorId}`, { method: 'PUT', body })
        : await api<Boda>('/bodas/borradores', { method: 'POST', body })
      setBorradorId(b.id)
      setAviso({ tone: 'success', text: 'Borrador guardado. Puedes retomarlo desde la lista de bodas.' })
    } catch (err) {
      setAviso({ tone: 'danger', text: (err as ApiError).message })
    }
  }

  async function confirmar() {
    setEnviando(true)
    setAviso(null)
    try {
      const body = {
        pareja: { ...pareja, correo: pareja.correo.trim() },
        evento: { ...evento, invitados_estimados: Number(evento.invitados_estimados) },
        presupuesto: {
          monto_total: Number(presupuesto.monto_total),
          conceptos: presupuesto.conceptos.map((c) => ({ ...c, monto_acordado: Number(c.monto_acordado) })),
        },
      }
      const q = borradorId ? `?borrador_id=${borradorId}` : ''
      const boda = await api<Boda>(`/bodas/onboarding${q}`, { method: 'POST', body })
      navigate(`/bodas/${boda.id}`, { replace: true, state: { message: 'Boda registrada' } })
    } catch (err) {
      setAviso({ tone: 'danger', text: (err as ApiError).message })
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <Loading />

  const setP = (k: keyof ParejaForm) => (e: { target: { value: string } }) => setPareja({ ...pareja, [k]: e.target.value })
  const setE = (k: keyof EventoForm) => (e: { target: { value: string } }) => setEvento({ ...evento, [k]: e.target.value })
  const sumaConceptos = presupuesto.conceptos.reduce((s, c) => s + (Number(c.monto_acordado) || 0), 0)

  return (
    <>
      <PageHeader title="Nueva boda" sub={<Link to="/bodas">Volver a bodas</Link>} />

      <ol className="stepper" aria-label="Avance del registro">
        {PASOS.map((nombre, i) => {
          const n = i + 1
          const estado = paso > n ? 'done' : paso === n ? 'current' : 'todo'
          return (
            <li key={nombre} className={`stepper__step stepper__step--${estado}`} aria-current={paso === n ? 'step' : undefined}>
              <span className="stepper__num">{n}</span>
              <span className="stepper__label">{nombre}</span>
            </li>
          )
        })}
      </ol>
      <p className="muted stepper__caption">
        {paso <= 3 ? `Paso ${paso} de 3` : 'Revisa los datos antes de confirmar'}
      </p>

      {aviso ? <Notice tone={aviso.tone}>{aviso.text}</Notice> : null}

      {paso <= 3 ? (
        <form className="panel wizard" onSubmit={siguiente} noValidate>
          {paso === 1 && (
            <div className="form-grid">
              <h2 className="panel__title span-2">¿Quiénes se casan?</h2>
              <TextField label="Nombre del contrayente 1" value={pareja.nombre_contrayente1} onChange={setP('nombre_contrayente1')} error={errors.nombre_contrayente1} maxLength={100} />
              <TextField label="Nombre del contrayente 2" value={pareja.nombre_contrayente2} onChange={setP('nombre_contrayente2')} error={errors.nombre_contrayente2} maxLength={100} />
              <TextField label="Correo de contacto" type="email" value={pareja.correo} onChange={setP('correo')} error={errors.correo} />
              <TextField label="Teléfono" inputMode="numeric" maxLength={10} value={pareja.telefono} onChange={(e) => setPareja({ ...pareja, telefono: e.target.value.replace(/\D/g, '') })} error={errors.telefono} hint="10 dígitos" />
            </div>
          )}
          {paso === 2 && (
            <div className="form-grid">
              <h2 className="panel__title span-2">El evento</h2>
              <TextField label="Fecha de la boda" type="date" min={hoyISO()} value={evento.fecha} onChange={setE('fecha')} error={errors.fecha} />
              <TextField label="Invitados estimados" type="number" min={1} value={evento.invitados_estimados} onChange={setE('invitados_estimados')} error={errors.invitados_estimados} />
              <TextField label="Lugar" value={evento.lugar} onChange={setE('lugar')} error={errors.lugar} placeholder="Hacienda, salón, playa…" />
              <TextField label="Estilo del evento" value={evento.estilo} onChange={setE('estilo')} error={errors.estilo} placeholder="Hacienda clásica, boho, minimalista…" />
            </div>
          )}
          {paso === 3 && (
            <div className="form-grid">
              <h2 className="panel__title span-2">Presupuesto inicial</h2>
              <TextField label="Monto total disponible (MXN)" type="number" min={0} step="0.01" value={presupuesto.monto_total} onChange={(e) => setPresupuesto({ ...presupuesto, monto_total: e.target.value })} error={errors.monto_total} />
              <div className="span-2">
                <p className="label">Conceptos de gasto previstos (opcional)</p>
                {presupuesto.conceptos.map((c, i) => (
                  <div className="concept-row" key={i}>
                    <TextField label="Concepto" value={c.descripcion} placeholder="Banquete, fotografía…" error={errors[`c${i}d`]} onChange={(e) => setPresupuesto({ ...presupuesto, conceptos: presupuesto.conceptos.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)) })} />
                    <TextField label="Monto" type="number" min={0} step="0.01" value={c.monto_acordado} error={errors[`c${i}m`]} onChange={(e) => setPresupuesto({ ...presupuesto, conceptos: presupuesto.conceptos.map((x, j) => (j === i ? { ...x, monto_acordado: e.target.value } : x)) })} />
                    <button type="button" className="link-button concept-row__remove" onClick={() => setPresupuesto({ ...presupuesto, conceptos: presupuesto.conceptos.filter((_, j) => j !== i) })}>
                      Quitar
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost" onClick={() => setPresupuesto({ ...presupuesto, conceptos: [...presupuesto.conceptos, { descripcion: '', monto_acordado: '' }] })}>
                  Agregar concepto
                </button>
                {Number(presupuesto.monto_total) > 0 && sumaConceptos > Number(presupuesto.monto_total) ? (
                  <Notice tone="warning">Los conceptos suman {money(sumaConceptos)}, más que el presupuesto total.</Notice>
                ) : null}
              </div>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => void guardarBorrador()}>
              Guardar borrador
            </button>
            <span className="spacer" />
            {paso > 1 && (
              <button type="button" className="btn" onClick={() => (setErrors({}), setPaso(paso - 1))}>
                Anterior
              </button>
            )}
            <button className="btn btn--primary">{paso === 3 ? 'Revisar' : 'Siguiente'}</button>
          </div>
        </form>
      ) : (
        <section className="panel wizard">
          <h2 className="panel__title">Resumen</h2>
          <dl className="summary">
            <div>
              <dt>Pareja</dt>
              <dd>
                {pareja.nombre_contrayente1} & {pareja.nombre_contrayente2}
                <br />
                <span className="muted">
                  {pareja.correo}, {pareja.telefono}
                </span>
              </dd>
            </div>
            <div>
              <dt>Evento</dt>
              <dd>
                {fecha(evento.fecha, { month: 'long', weekday: 'long' })}
                <br />
                <span className="muted">
                  {evento.lugar}, estilo {evento.estilo.toLowerCase()}, {evento.invitados_estimados} invitados
                </span>
              </dd>
            </div>
            <div>
              <dt>Presupuesto</dt>
              <dd>
                {money(Number(presupuesto.monto_total))}
                {presupuesto.conceptos.length > 0 && (
                  <ul className="summary__list">
                    {presupuesto.conceptos.map((c, i) => (
                      <li key={i}>
                        {c.descripcion}: {money(Number(c.monto_acordado))}
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setPaso(3)}>
              Anterior
            </button>
            <span className="spacer" />
            <button className="btn btn--primary" disabled={enviando} onClick={() => void confirmar()}>
              {enviando ? 'Registrando…' : 'Confirmar y crear boda'}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
