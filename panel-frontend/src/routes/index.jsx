import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Login from '../pages/Login'
import Layout from '../components/Layout'
import Dashboard from '../pages/Dashboard'
import Estudiantes from '../pages/Estudiantes'
import Inscripciones from '../pages/Inscripciones'
import GruposMaterias from '../pages/GruposMaterias'
import Usuarios from '../pages/Usuarios'
import Logs from '../pages/Logs'
import Semillas from '../pages/Semillas'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, hasRole, loading } = useAuth()

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />
  }

  return children
}

const AppRoutes = () => {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="estudiantes" element={<Estudiantes />} />
        <Route path="inscripciones" element={<Inscripciones />} />
        <Route path="grupos-materias" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <GruposMaterias />
          </ProtectedRoute>
        } />
        <Route path="usuarios" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Usuarios />
          </ProtectedRoute>
        } />
        <Route path="logs" element={<Logs />} />
        <Route path="semillas" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Semillas />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

export default AppRoutes
