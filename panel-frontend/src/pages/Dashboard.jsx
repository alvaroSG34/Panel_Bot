import { useEffect, useState } from 'react'
import { Grid, Paper, Typography, Box, Card, CardContent, Skeleton } from '@mui/material'
import { 
  People as PeopleIcon, 
  Assignment as AssignmentIcon, 
  CheckCircle as CheckCircleIcon, 
  Error as ErrorIcon,
  Queue as QueueIcon,
  PlayArrow as PlayArrowIcon,
  Notifications as NotificationsIcon,
  Done as DoneIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import api from '../api/axios'

const StatCard = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="text.secondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4">
            {value}
          </Typography>
        </Box>
        <Box sx={{ color: color, fontSize: 48 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
)

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    totalInscripciones: 0,
    inscripcionesCompletadas: 0,
    inscripcionesPendientes: 0,
  })
  const [botStatus, setBotStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [estudiantesStatsRes, boletasStatsRes, botStatusRes] = await Promise.all([
          api.get('/estudiantes/stats'),
          api.get('/boletas/stats'),
          api.get('/bot/status')
        ])

        const estudiantesStats = estudiantesStatsRes.data
        const boletasStats = boletasStatsRes.data

        setStats({
          totalEstudiantes: estudiantesStats.total || 0,
          totalInscripciones: boletasStats.total || 0,
          inscripcionesCompletadas: boletasStats.porEstado?.completado || 0,
          inscripcionesPendientes: 
            (boletasStats.porEstado?.pendiente || 0) +
            (boletasStats.porEstado?.confirmado || 0) +
            (boletasStats.porEstado?.procesando || 0),
        })

        setBotStatus(botStatusRes.data)
        setLoading(false)
      } catch (error) {
        console.error('Error al obtener estadísticas:', error)
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Poll cada 5s

    return () => clearInterval(interval)
  }, [])

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {/* Estadísticas Generales */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Estudiantes"
            value={stats.totalEstudiantes}
            icon={<PeopleIcon fontSize="inherit" />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Inscripciones"
            value={stats.totalInscripciones}
            icon={<AssignmentIcon fontSize="inherit" />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completadas"
            value={stats.inscripcionesCompletadas}
            icon={<CheckCircleIcon fontSize="inherit" />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pendientes"
            value={stats.inscripcionesPendientes}
            icon={<ErrorIcon fontSize="inherit" />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      {/* Sistema de Colas */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Sistema de Colas
        </Typography>
        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Grid item xs={12} sm={6} md={2.4} key={i}>
                <Card>
                  <CardContent>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" height={40} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : botStatus?.queueStats ? (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Trabajos en Cola"
                value={botStatus.queueStats.jobsPending || 0}
                icon={<QueueIcon fontSize="inherit" />}
                color="info.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Procesando"
                value={botStatus.queueStats.jobsProcessing || 0}
                icon={<PlayArrowIcon fontSize="inherit" />}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Notificaciones Pendientes"
                value={botStatus.queueStats.notificationsPending || 0}
                icon={<NotificationsIcon fontSize="inherit" />}
                color="warning.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Completados"
                value={botStatus.queueStats.totalCompleted || 0}
                icon={<DoneIcon fontSize="inherit" />}
                color="success.main"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <StatCard
                title="Fallidos"
                value={botStatus.queueStats.totalFailed || 0}
                icon={<CancelIcon fontSize="inherit" />}
                color="error.main"
              />
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary">
            Sistema de colas no disponible (bot desconectado)
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default Dashboard
