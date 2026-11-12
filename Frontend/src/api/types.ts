export type Rol = 'ADMINISTRADOR' | 'WEDDING_PLANNER'
export type EstadoBoda = 'BORRADOR' | 'ACTIVA' | 'REALIZADA' | 'CANCELADA'
export type TipoServicio = 'BANQUETE' | 'MUSICA' | 'FOTOGRAFIA' | 'FLORES' | 'LUGAR' | 'OTRO'
export type EstadoPago = 'PENDIENTE' | 'PAGADO' | 'VENCIDO'
export type EstadoTarea = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA'
export type PrioridadTarea = 'ALTA' | 'MEDIA' | 'BAJA'

export interface Usuario {
  id: number
  nombre_completo: string
  correo: string
  rol: Rol
  activo: boolean
  fecha_registro: string
}

export interface TokenOut {
  access_token: string
  token_type: string
  expires_at: string
  usuario: Usuario
}

export interface Pareja {
  id: number
  nombre_contrayente1: string
  nombre_contrayente2: string
  correo: string
  telefono: string
  nombre: string
}

export interface Boda {
  id: number
  estado: EstadoBoda
  paso_onboarding: number
  fecha: string | null
  lugar: string | null
  estilo: string | null
  invitados_estimados: number | null
  pareja: Pareja | null
  dias_restantes: number | null
  datos_borrador: BorradorDatos | null
}

export interface ParejaForm {
  nombre_contrayente1: string
  nombre_contrayente2: string
  correo: string
  telefono: string
}
export interface EventoForm {
  fecha: string
  lugar: string
  estilo: string
  invitados_estimados: string
}
export interface ConceptoForm {
  descripcion: string
  monto_acordado: string
}
export interface PresupuestoForm {
  monto_total: string
  conceptos: ConceptoForm[]
}
export interface BorradorDatos {
  pareja?: Partial<ParejaForm> | null
  evento?: Partial<EventoForm> | null
  presupuesto?: Partial<PresupuestoForm> | null
}

export interface Proveedor {
  id: number
  nombre: string
  tipo_servicio: TipoServicio
  nombre_contacto: string | null
  telefono: string | null
  correo: string | null
  notas: string | null
  activo: boolean
}

export interface Pago {
  id: number
  concepto_id: number
  monto: number
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: EstadoPago
  simulado: boolean
}

export interface Concepto {
  id: number
  descripcion: string
  monto_acordado: number
  monto_programado: number
  monto_pagado: number
  saldo: number
  proveedor: { id: number; nombre: string; tipo_servicio: string } | null
  pagos: Pago[]
}

export interface Presupuesto {
  id: number
  boda_id: number
  monto_total: number
  monto_comprometido: number
  monto_pagado: number
  saldo_pendiente: number
  disponible: number
  excedido: boolean
  conceptos: Concepto[]
}

export interface AlertaPago {
  pago_id: number
  boda_id: number
  pareja: string
  concepto: string
  monto: number
  fecha_vencimiento: string
  dias: number
  nivel: 'amarillo' | 'rojo'
}

export interface Tarea {
  id: number
  boda_id: number
  titulo: string
  descripcion: string | null
  fecha_limite: string
  prioridad: PrioridadTarea
  estado: EstadoTarea
  fecha_termino: string | null
  vencida: boolean
  pareja: string | null
}

export interface Dashboard {
  bodas_activas: number
  bodas_proximos_30_dias: number
  tareas_pendientes: number
  tareas_vencidas: number
  pagos_proximos: number
  pagos_vencidos: number
  alertas_pagos: AlertaPago[]
  finanzas: {
    monto_total: number
    monto_comprometido: number
    monto_pagado: number
    saldo_pendiente: number
  }
  proximas_bodas: Boda[]
}

export interface Expediente {
  boda: Boda
  presupuesto: Presupuesto | null
  alertas_pagos: AlertaPago[]
  proveedores: Proveedor[]
  tareas: {
    pendientes: number
    en_proceso: number
    completadas: number
    vencidas: number
    lista: Tarea[]
  }
  fechas_importantes: { id: number; titulo: string; fecha: string; descripcion: string | null }[]
  invitados: { total: number; confirmados: number; pendientes: number; rechazados: number }
}
