import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { homeFor, useAuth } from '../auth/AuthContext'
import { Notice, TextField } from '../components/ui'

export default function Login() {
  const { user, login, flash } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { from?: string } | null
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      const u = await login(correo.trim(), password)
      const from = state?.from && u.rol === 'WEDDING_PLANNER' ? state.from : homeFor(u)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as ApiError).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="login">
      <section className="login__art" aria-hidden="true">
        <p className="login__quote">
          Cada boda,
          <br />
          en un solo lugar.
        </p>
      </section>
      <section className="login__panel">
        <form className="login__form" onSubmit={onSubmit} noValidate>
          <p className="brand brand--dark">
            <span className="brand__rings" aria-hidden="true" />
            Xcellent Day
          </p>
          <h1>Inicia sesión</h1>
          {flash && !error ? <Notice>{flash}</Notice> : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <TextField
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn btn--primary btn--block" disabled={sending || !correo || !password}>
            {sending ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <p className="muted small">¿No tienes cuenta? Pídela al administrador de tu equipo.</p>
        </form>
      </section>
    </div>
  )
}
