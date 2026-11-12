import type { EstadoBoda, EstadoPago, EstadoTarea, PrioridadTarea, TipoServicio } from '../api/types'

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const money = (n: number | null | undefined) => mxn.format(n ?? 0)

export function fecha(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

export function hoyISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function diasTexto(dias: number) {
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'mañana'
  if (dias === -1) return 'ayer'
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`
}

export const TIPO_SERVICIO: Record<TipoServicio, string> = {
  BANQUETE: 'Banquete',
  MUSICA: 'Música',
  FOTOGRAFIA: 'Fotografía',
  FLORES: 'Flores',
  LUGAR: 'Lugar',
  OTRO: 'Otro',
}

export const ESTADO_BODA: Record<EstadoBoda, string> = {
  BORRADOR: 'Borrador',
  ACTIVA: 'Activa',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
}

export const ESTADO_PAGO: Record<EstadoPago, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  VENCIDO: 'Vencido',
}

export const ESTADO_TAREA: Record<EstadoTarea, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
}

export const PRIORIDAD: Record<PrioridadTarea, string> = {
  ALTA: 'Alta',
  MEDIA: 'Media',
  BAJA: 'Baja',
}
