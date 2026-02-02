import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar usuario desde localStorage al montar
    const storedUser = localStorage.getItem('user')
    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error al parsear usuario desde localStorage:', error)
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (nombre_usuario, contraseña) => {
    try {
      console.log('Intentando login con:', { nombre_usuario, contraseña })
      // El backend espera 'username' y 'password', no 'nombre_usuario' y 'contraseña'
      const response = await api.post('/auth/login', { 
        username: nombre_usuario, 
        password: contraseña 
      })
      
      console.log('Resultado del login:', response.data)
      
      // El backend devuelve accessToken, refreshToken, user (no access_token, refresh_token, usuario)
      const { accessToken, refreshToken, user } = response.data

      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      localStorage.setItem('user', JSON.stringify(user))
      
      setUser(user)
      return { success: true }
    } catch (error) {
      console.error('Error en login:', error)
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al iniciar sesión' 
      }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Error en logout:', error)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  const hasRole = (roles) => {
    if (!user) return false
    return roles.includes(user.role)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
