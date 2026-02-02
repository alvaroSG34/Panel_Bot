import { useEffect, useState } from 'react'
import { Grid, Paper, Typography, Box, Card, CardContent } from '@mui/material'
import { People as PeopleIcon, Assignment as AssignmentIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material'
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [estudiantesRes, inscripcionesRes] = await Promise.all([
          api.get('/estudiantes'),
          api.get('/boletas')
        ])

        const estudiantes = estudiantesRes.data
        const inscripciones = inscripcionesRes.data

        setStats({
          totalEstudiantes: estudiantes.length,
          totalInscripciones: inscripciones.length,
          inscripcionesCompletadas: inscripciones.filter(i => i.estado === 'completado').length,
          inscripcionesPendientes: inscripciones.filter(i => ['pendiente', 'confirmado', 'procesando'].includes(i.estado)).length,
        })
      } catch (error) {
        console.error('Error al obtener estadísticas:', error)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Poll cada 30s

    return () => clearInterval(interval)
  }, [])

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
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
    </Box>
  )
}

export default Dashboard
