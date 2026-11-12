import { useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError, api } from '../api/client'
import type { Boda, Concepto, Presupuesto as PresupuestoData, Proveedor } from '../api/types'
import { BodaHeader } from '../components/BodaHeader'
import { Badge, Loading, Notice, SelectField, TextField } from '../components/ui'
import { ESTADO_PAGO, TIPO_SERVICIO, fecha, hoyISO, money } from '../lib/format'
import { useApi } from '../lib/useApi'

const TONO_PAGO = { PENDIENTE: 'draft', PAGADO: 'ok', VENCIDO: 'danger' } as const

export default function Presupuesto() {
  const { id } = useParams()
  const boda = useApi<Boda>(`/bodas/${id}`)
  const { data: p, setData, error, loading } = useApi<PresupuestoData>(`/bodas/${id}/presupuesto`)
  const proveedores = useApi<Proveedor[]>('/proveedores?activo=true')
  const [aviso, setAviso] = useState<string | null>(null)
  const [editTotal, setEditTotal] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState({ descripcion: '', monto_acordado: '', proveedor_id: '' })
  const [nuevoErr, setNuevoErr] = useState<ApiError | null>(null)

  async function run(fn: () => Promise<PresupuestoData>) {
    setAviso(null)
    try {
      setData(await fn()) // los totales se actualizan sin recargar (RF07 CA4)
      return true
    } catch (e) {
      setAviso((e as ApiError).message)
      return false
    }
  }

  if ((loading && !p) || boda.loading) return <Loading />
  if (error || !p || !boda.data) return <Notice tone="danger">{(error ?? boda.error)?.message}</Notice>

  async function agregarConcepto(e: FormEvent) {
    e.preventDefault()
    setNuevoErr(null)
    try {
      const r = await api<PresupuestoData>(`/bodas/${id}/presupuesto/conceptos`, {
        method: 'POST',
        body: {
          descripcion: nuevo.descripcion,
          monto_acordado: nuevo.monto_acordado === '' ? null : Number(nuevo.monto_acordado),
          proveedor_id: nuevo.proveedor_id ? Number(nuevo.proveedor_id) : null,
        },
      })
      setData(r)
      setNuevo({ descripcion: '', monto_acordado: '', proveedor_id: '' })
    } catch (err) {
      setNuevoErr(err as ApiError)
    }
  }

  return (
    <>
      <BodaHeader boda={boda.data} />
      {aviso ? <Notice tone="danger">{aviso}</Notice> : null}

      <section className="panel">
        <dl className="figures figures--large">
          <div>
            <dt>Presupuesto total</dt>
            <dd>
              {editTotal === null ? (
                <>
                  {money(p.monto_total)}{' '}
                  <button className="link-button small" onClick={() => setEditTotal(String(p.monto_total))}>
                    Ajustar
                  </button>
                </>
              ) : (
                <form
                  className="inline-form"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    const ok = await run(() =>
                      api(`/bodas/${id}/presupuesto`, { method: 'PATCH', body: { monto_total: Number(editTotal) } }),
                    )
                    if (ok) setEditTotal(null)
                  }}
                >
                  <label className="sr-only" htmlFor="total">
                    Presupuesto total
                  </label>
                  <input id="total" type="number" min={0} step="0.01" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} />
                  <button className="btn btn--primary">Guardar</button>
                  <button type="button" className="btn" onClick={() => setEditTotal(null)}>
                    Cancelar
                  </button>
                </form>
              )}
            </dd>
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
          <div>
            <dt>Sin asignar</dt>
            <dd className={p.disponible < 0 ? 'text-danger' : ''}>{money(p.disponible)}</dd>
          </div>
        </dl>
        {p.excedido ? (
          <Notice tone="warning">
            Presupuesto excedido: los conceptos suman {money(p.monto_comprometido)} y el total es {money(p.monto_total)}.
          </Notice>
        ) : null}
        <p className="muted small">Los pagos son simulados: aquí se registran, no se cobra dinero real.</p>
      </section>

      {p.conceptos.map((c) => (
        <ConceptoCard key={c.id} concepto={c} run={run} />
      ))}

      <form className="panel form-grid form-grid--3" onSubmit={agregarConcepto} noValidate>
        <h2 className="panel__title span-all">Agregar concepto</h2>
        <TextField label="Concepto" placeholder="Banquete, música, fotografía…" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} error={nuevoErr?.campo('descripcion')} />
        <TextField label="Monto acordado (MXN)" type="number" min={0} step="0.01" value={nuevo.monto_acordado} onChange={(e) => setNuevo({ ...nuevo, monto_acordado: e.target.value })} error={nuevoErr?.campo('monto_acordado')} />
        <SelectField label="Proveedor (opcional)" value={nuevo.proveedor_id} onChange={(e) => setNuevo({ ...nuevo, proveedor_id: e.target.value })}>
          <option value="">Gasto general</option>
          {proveedores.data?.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre} ({TIPO_SERVICIO[x.tipo_servicio]})
            </option>
          ))}
        </SelectField>
        {nuevoErr && !nuevoErr.errores.length ? (
          <div className="span-all">
            <Notice tone="danger">{nuevoErr.message}</Notice>
          </div>
        ) : null}
        <div className="form-actions span-all">
          <button className="btn btn--primary">Agregar concepto</button>
        </div>
      </form>
    </>
  )
}

function ConceptoCard({ concepto: c, run }: { concepto: Concepto; run: (fn: () => Promise<PresupuestoData>) => Promise<boolean> }) {
  const [abierto, setAbierto] = useState(false)
  const [pago, setPago] = useState({ monto: '', fecha_vencimiento: '', pagado: false, fecha_pago: hoyISO() })
  const porProgramar = c.monto_acordado - c.monto_programado

  async function programar(e: FormEvent) {
    e.preventDefault()
    const ok = await run(() =>
      api(`/conceptos/${c.id}/pagos`, {
        method: 'POST',
        body: {
          monto: Number(pago.monto),
          fecha_vencimiento: pago.fecha_vencimiento,
          fecha_pago: pago.pagado ? pago.fecha_pago : null,
        },
      }),
    )
    if (ok) {
      setAbierto(false)
      setPago({ monto: '', fecha_vencimiento: '', pagado: false, fecha_pago: hoyISO() })
    }
  }

  return (
    <section className="panel concept">
      <div className="concept__head">
        <div>
          <h2 className="panel__title">{c.descripcion}</h2>
          <p className="muted small">{c.proveedor ? c.proveedor.nombre : 'Gasto general'}</p>
        </div>
        <dl className="concept__nums">
          <div>
            <dt>Acordado</dt>
            <dd>{money(c.monto_acordado)}</dd>
          </div>
          <div>
            <dt>Pagado</dt>
            <dd>{money(c.monto_pagado)}</dd>
          </div>
          <div>
            <dt>Saldo</dt>
            <dd>{money(c.saldo)}</dd>
          </div>
        </dl>
      </div>

      {c.pagos.length ? (
        <div className="table-wrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <th>Monto</th>
                <th>Vence</th>
                <th>Pagado el</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {c.pagos.map((pg) => (
                <tr key={pg.id}>
                  <td>{money(pg.monto)}</td>
                  <td>{fecha(pg.fecha_vencimiento)}</td>
                  <td>{fecha(pg.fecha_pago)}</td>
                  <td>
                    <Badge tone={TONO_PAGO[pg.estado]}>{ESTADO_PAGO[pg.estado]}</Badge>
                  </td>
                  <td className="cell-actions">
                    {pg.estado !== 'PAGADO' && (
                      <>
                        <button className="btn btn--small" onClick={() => void run(() => api(`/pagos/${pg.id}/pagar`, { method: 'POST', body: {} }))}>
                          Registrar pago
                        </button>
                        <button className="link-button small" onClick={() => void run(() => api(`/pagos/${pg.id}`, { method: 'DELETE' }))}>
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Sin pagos programados.</p>
      )}

      {abierto ? (
        <form className="pay-form" onSubmit={programar} noValidate>
          <TextField label="Monto" type="number" min={0} step="0.01" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} hint={`Por programar: ${money(porProgramar)}`} />
          <TextField label="Fecha de vencimiento" type="date" value={pago.fecha_vencimiento} onChange={(e) => setPago({ ...pago, fecha_vencimiento: e.target.value })} />
          <label className="check">
            <input type="checkbox" checked={pago.pagado} onChange={(e) => setPago({ ...pago, pagado: e.target.checked })} />
            Ya está pagado
          </label>
          {pago.pagado ? <TextField label="Fecha de pago" type="date" value={pago.fecha_pago} onChange={(e) => setPago({ ...pago, fecha_pago: e.target.value })} /> : null}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
            <button className="btn btn--primary" disabled={!pago.monto || !pago.fecha_vencimiento}>
              Guardar pago
            </button>
          </div>
        </form>
      ) : (
        <div className="concept__actions">
          {porProgramar > 0 && (
            <button className="btn btn--ghost" onClick={() => setAbierto(true)}>
              Programar pago
            </button>
          )}
          {c.monto_pagado === 0 && (
            <button className="link-button small" onClick={() => void run(() => api(`/conceptos/${c.id}`, { method: 'DELETE' }))}>
              Eliminar concepto
            </button>
          )}
        </div>
      )}
    </section>
  )
}
