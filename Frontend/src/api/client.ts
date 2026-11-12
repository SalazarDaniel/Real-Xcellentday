const TOKEN_KEY = 'xd_token'
const USER_KEY = 'xd_user'

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  getUser: () => sessionStorage.getItem(USER_KEY),
  setUser: (json: string) => sessionStorage.setItem(USER_KEY, json),
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
  },
}

export interface FieldError {
  campo: string
  etiqueta: string
  mensaje: string
}

export class ApiError extends Error {
  status: number
  errores: FieldError[]
  code?: string
  constructor(status: number, message: string, errores: FieldError[] = [], code?: string) {
    super(message)
    this.status = status
    this.errores = errores
    this.code = code
  }
  /** Mensaje de error por campo, con la ruta completa (p. ej. "pareja.telefono"). */
  campo(nombre: string): string | undefined {
    return this.errores.find((e) => e.campo === nombre || e.campo.endsWith(`.${nombre}`))?.mensaje
  }
}

type UnauthorizedHandler = (message: string) => void
let onUnauthorized: UnauthorizedHandler | null = null
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión.')
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const detail = data?.detail
    const message =
      typeof detail === 'string'
        ? detail
        : (detail?.message ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
    if (res.status === 401 && auth && onUnauthorized) onUnauthorized(message)
    throw new ApiError(res.status, message, data?.errores ?? [], detail?.code)
  }
  return data as T
}
