import { useEffect, useState } from 'react'
import { Chip } from '@mui/material'
import { Circle as CircleIcon } from '@mui/icons-material'
import api from '../api/axios'

const BotStatusWidget = () => {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/bot/status')
        setStatus(response.data)
      } catch (error) {
        console.error('Error al obtener estado del bot:', error)
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 30000) // Poll cada 30s

    return () => clearInterval(interval)
  }, [])

  if (!status) return null

  const getStatusColor = (isConnected) => {
    return isConnected ? 'success' : 'error'
  }

  const getStatusText = (isConnected) => {
    return isConnected ? 'Conectado' : 'Desconectado'
  }

  return (
    <Chip
      icon={<CircleIcon sx={{ fontSize: 12 }} />}
      label={`Bot: ${getStatusText(status.is_connected)}`}
      color={getStatusColor(status.is_connected)}
      size="small"
      variant="outlined"
      sx={{ color: 'white', borderColor: 'white' }}
    />
  )
}

export default BotStatusWidget
