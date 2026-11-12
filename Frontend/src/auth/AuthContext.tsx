import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setUnauthorizedHandler, tokenStore } from '../api/client'
import type { TokenOut, Usuario } from '../api/types'

interface AuthState {
  user: Usuario | null
  login: (correo: string, password: string) => Promise<Usuario>
  logout: () => Promise<void>
  /** Mensaje para la pantalla de inicio de sesión («Sesión cerrada», «Tu sesión expiró»). */
  flash: string | null
}

const AuthContext = createContext<AuthState | null>(null)

export function homeFor(user: Usuario) {
  return user.rol === 'ADMINISTRADOR' ? '/usuarios' : '/'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<Usuario | null>(() => {
    const raw = tokenStore.getUser()
    return raw && tokenStore.get() ? (JSON.parse(raw) as Usuario) : null
  })

  const [flash, setFlash] = useState<string | null>(null)

  const finish = useCallback(
    (message: string) => {
      tokenStore.clear()
      setFlash(message)
      setUser(null)
      navigate('/login', { replace: true })
    },
    [navigate],
  )

  // Si la API responde 401 (token expirado o sesión cerrada), regresar al inicio de sesión (RF03).
  useEffect(() => {
    setUnauthorizedHandler((msg) =>
      finish(msg === 'Tu sesión expiró' ? 'Tu sesión expiró' : 'Inicia sesión para continuar'),
    )
    return () => setUnauthorizedHandler(null)
  }, [finish])

  const login = useCallback(async (correo: string, password: string) => {
    const data = await api<TokenOut>('/auth/login', {
      method: 'POST',
      body: { correo, password },
      auth: false,
    })
    tokenStore.set(data.access_token)
    tokenStore.setUser(JSON.stringify(data.usuario))
    setFlash(null)
    setUser(data.usuario)
    return data.usuario
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      /* el token ya podía estar invalidado */
    }
    finish('Sesión cerrada')
  }, [finish])

  const value = useMemo(() => ({ user, login, logout, flash }), [user, login, logout, flash])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
