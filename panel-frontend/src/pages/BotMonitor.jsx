import { useEffect, useState } from 'react'
import { 
  Box, Typography, Paper, Grid, Chip, Alert, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Card, CardContent,
  Button, Divider
} from '@mui/material'
import { 
  CheckCircle as CheckCircleIcon, 
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  CloudOff as CloudOffIcon
} from '@mui/icons-material'
import api from '../api/axios'

const BotMonitor = () => {
  const [botStatus, setBotStatus] = useState(null)
  const [heartbeat, setHeartbeat] = useState(null)
  const [groupsCache, setGroupsCache] = useState([])
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBotData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [statusRes, heartbeatRes, groupsRes, instancesRes] = await Promise.all([
        api.get('/bot/status').catch(() => ({ data: null })),
        api.get('/bot/heartbeat').catch(() => ({ data: null })),
        api.get('/bot/groups-cache').catch(() => ({ data: [] })),
        api.get('/bot/instances').catch(() => ({ data: [] })),
      ])

      setBotStatus(statusRes.data)
      setHeartbeat(heartbeatRes.data)
      setGroupsCache(Array.isArray(groupsRes.data) ? groupsRes.data : [])
      setInstances(Array.isArray(instancesRes.data) ? instancesRes.data : [])
    } catch (error) {
      console.error('Error al obtener datos del bot:', error)
      setError('Error al conectar con el bot')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBotData()
    const interval = setInterval(fetchBotData, 10000) // Poll cada 10s
    return () => clearInterval(interval)
  }, [])

  const isOnline = () => {
    if (!heartbeat) return false
    const lastConnection = new Date(heartbeat.ultima_conexion)
    const now = new Date()
    const diffMinutes = (now - lastConnection) / (1000 * 60)
    return diffMinutes < 2 // Considera online si heartbeat < 2 minutos
  }

  const getStatusColor = () => {
    return isOnline() ? 'success' : 'error'
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Monitoreo del Bot
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchBotData}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Estado del Bot */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {isOnline() ? (
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <CloudOffIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="h6">
                  Estado
                </Typography>
              </Box>
              <Chip 
                label={isOnline() ? 'En Línea' : 'Desconectado'} 
                color={getStatusColor()}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Estado WhatsApp
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {heartbeat?.estado_whatsapp || 'Desconocido'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Versión del Bot
              </Typography>
              <Typography variant="h6" sx={{ mt: 1 }}>
                {heartbeat?.version_bot || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Última Conexión
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {heartbeat?.ultima_conexion 
                  ? new Date(heartbeat.ultima_conexion).toLocaleString('es-ES')
                  : 'Nunca'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Instancias Múltiples */}
      {instances.length > 1 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            ⚠️ Múltiples instancias detectadas ({instances.length})
          </Typography>
          <Typography variant="body2">
            Se detectaron varias instancias del bot corriendo simultáneamente. Esto puede causar conflictos.
          </Typography>
        </Alert>
      )}

      {/* Cache de Grupos */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cache de Grupos de WhatsApp ({groupsCache.length})
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        {groupsCache.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>JID Grupo</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Última Actualización</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupsCache.slice(0, 10).map((group, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {group.jid || 'N/A'}
                    </TableCell>
                    <TableCell>{group.nombre || 'Sin nombre'}</TableCell>
                    <TableCell>
                      {group.actualizado_en 
                        ? new Date(group.actualizado_en).toLocaleString('es-ES')
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No hay grupos en cache
          </Typography>
        )}
        
        {groupsCache.length > 10 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Mostrando 10 de {groupsCache.length} grupos
          </Typography>
        )}
      </Paper>

      {/* Información de Conexión */}
      {!isOnline() && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" fontWeight="bold">
            🔧 Configuración Requerida
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Para monitorear el bot desde el droplet, configura las siguientes variables de entorno en el bot:
          </Typography>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace' }}>
            <Typography variant="body2" component="pre" sx={{ m: 0 }}>
{`PANEL_API_URL=http://tu-panel.com:4000
PANEL_API_KEY=tu-api-key-secreta`}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            El bot debe enviar heartbeats periódicos a <code>/bot/heartbeat</code>
          </Typography>
        </Alert>
      )}
    </Box>
  )
}

export default BotMonitor
