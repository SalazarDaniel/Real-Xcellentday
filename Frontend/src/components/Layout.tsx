import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Rol } from '../api/types'
import { homeFor, useAuth } from '../auth/AuthContext'

const NAV_PLANNER = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/bodas', label: 'Bodas' },
  { to: '/tareas', label: 'Tareas' },
  { to: '/proveedores', label: 'Proveedores' },
]
const NAV_ADMIN = [{ to: '/usuarios', label: 'Usuarios', end: false }]

export function RequireAuth({ rol }: { rol?: Rol }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (rol && user.rol !== rol) return <Navigate to={homeFor(user)} replace />
  return <Outlet />
}

export function Layout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = user?.rol === 'ADMINISTRADOR' ? NAV_ADMIN : NAV_PLANNER

  return (
    <div className="shell">
      <aside className={`sidebar${menuOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <NavLink to={user ? homeFor(user) : '/'} className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand__rings" aria-hidden="true" />
            Xcellent Day
          </NavLink>
          <button
            className="sidebar__toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menú
          </button>
        </div>
        <nav id="main-nav" className="nav" aria-label="Principal">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__user">
          <p className="sidebar__name">{user?.nombre_completo}</p>
          <p className="sidebar__role">
            {user?.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Wedding planner'}
          </p>
          <button className="link-button" onClick={() => void logout()}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main" id="contenido">
        <Outlet />
      </main>
    </div>
  )
}
