import type { EstadoBoda, EstadoPago, EstadoRSVP, EstadoTarea, PrioridadTarea, TipoServicio } from "./types";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const mxnEntero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const mxnCompacto = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** $25,000 (sin centavos si el monto es entero, como en el diseño). */
export function money(n: number | null | undefined) {
  const v = n ?? 0;
  return Number.isInteger(v) ? mxnEntero.format(v) : mxn.format(v);
}

/** $12K, $1.2M */
export const moneyCompact = (n: number | null | undefined) => mxnCompacto.format(n ?? 0);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 15 Dic 2025 */
export function fecha(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const partes = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...opts,
  }).formatToParts(new Date(y, m - 1, d));
  return partes
    .filter((p) => p.type !== "literal" || p.value.trim() !== "de")
    .map((p) => (p.type === "month" ? cap(p.value.replace(".", "")) : p.value))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

export function hoyISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function diasTexto(dias: number) {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

/** 5512345678 → 55 1234 5678 */
export function telefono(t: string | null | undefined) {
  if (!t) return null;
  return /^\d{10}$/.test(t) ? `${t.slice(0, 2)} ${t.slice(2, 6)} ${t.slice(6)}` : t;
}

export function iniciales(nombre: string | undefined) {
  if (!nombre) return "";
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export const ESTADO_BODA: Record<EstadoBoda, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "En progreso",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

export const ESTADO_PAGO: Record<EstadoPago, string> = {
  PENDIENTE: "Pendiente",
  PAGADO: "Pagado",
  VENCIDO: "Deuda",
};

export const ESTADO_RSVP: Record<EstadoRSVP, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  RECHAZADO: "Declinado",
};

export const ESTADO_TAREA: Record<EstadoTarea, string> = {
  PENDIENTE: "Pendiente",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada",
};

export const PRIORIDAD: Record<PrioridadTarea, string> = {
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
};

export const TIPO_SERVICIO: Record<TipoServicio, string> = {
  LUGAR: "Venue",
  BANQUETE: "Catering",
  FOTOGRAFIA: "Fotografía",
  MUSICA: "Música",
  FLORES: "Flores",
  OTRO: "Otro",
};
