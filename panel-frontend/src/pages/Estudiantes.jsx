import { useEffect, useState } from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import api from '../api/axios'

const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEstudiantes = async () => {
      try {
        const response = await api.get('/estudiantes')
        setEstudiantes(response.data)
      } catch (error) {
        console.error('Error al obtener estudiantes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEstudiantes()
    const interval = setInterval(fetchEstudiantes, 30000) // Poll cada 30s

    return () => clearInterval(interval)
  }, [])

  const columns = [
    { field: 'numero_registro', headerName: 'Registro', width: 120 },
    { field: 'nombre_estudiante', headerName: 'Nombre', width: 250 },
    { field: 'carrera', headerName: 'Carrera', width: 200 },
    { field: 'id_whatsapp', headerName: 'WhatsApp ID', width: 200 },
    { field: 'total_materias_inscritas', headerName: 'Materias', width: 100, type: 'number' },
    { 
      field: 'creado_en', 
      headerName: 'Registrado', 
      width: 180,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleString('es-ES')
      }
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Estudiantes
      </Typography>
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={estudiantes}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>
    </Box>
  )
}

export default Estudiantes
