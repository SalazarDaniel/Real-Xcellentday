import { Link, Route, Routes } from 'react-router-dom'
import { Layout, RequireAuth } from './components/Layout'
import { Empty } from './components/ui'
import Bodas from './pages/Bodas'
import Dashboard from './pages/Dashboard'
import Expediente from './pages/Expediente'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Presupuesto from './pages/Presupuesto'
import Proveedores from './pages/Proveedores'
import Tareas from './pages/Tareas'
import Usuarios from './pages/Usuarios'

function NoEncontrado() {
  return (
    <Empty title="Esta página no existe">
      <Link to="/">Volver al inicio</Link>
    </Empty>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route element={<RequireAuth rol="ADMINISTRADOR" />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
          <Route element={<RequireAuth rol="WEDDING_PLANNER" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bodas" element={<Bodas />} />
            <Route path="/bodas/nueva" element={<Onboarding />} />
            <Route path="/bodas/:id" element={<Expediente />} />
            <Route path="/bodas/:id/presupuesto" element={<Presupuesto />} />
            <Route path="/bodas/:id/tareas" element={<Tareas />} />
            <Route path="/tareas" element={<Tareas />} />
            <Route path="/proveedores" element={<Proveedores />} />
          </Route>
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  )
}
