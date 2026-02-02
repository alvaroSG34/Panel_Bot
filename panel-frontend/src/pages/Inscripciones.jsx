import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Chip } from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import api from '../api/axios'

const getEstadoColor = (estado) => {
  const colors = {
    'pendiente': 'warning',
    'confirmado': 'info',
    'procesando': 'primary',
    'completado': 'success',
    'error': 'error',
  }
  return colors[estado] || 'default'
}

const Inscripciones = () => {
  const [inscripciones, setInscripciones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInscripciones = async () => {
      try {
        const response = await api.get('/boletas')
        setInscripciones(response.data)
      } catch (error) {
        console.error('Error al obtener inscripciones:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInscripciones()
    const interval = setInterval(fetchInscripciones, 30000) // Poll cada 30s

    return () => clearInterval(interval)
  }, [])

  const columns = [
    { 
      field: 'numero_registro', 
      headerName: 'Registro', 
      width: 120,
      valueGetter: (params) => params.row.estudiante?.numero_registro || 'N/A'
    },
    { 
      field: 'nombre_estudiante', 
      headerName: 'Estudiante', 
      width: 200,
      valueGetter: (params) => params.row.estudiante?.nombre_estudiante || 'N/A'
    },
    { 
      field: 'estado', 
      headerName: 'Estado', 
      width: 130,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getEstadoColor(params.value)} 
          size="small"
        />
      )
    },
    { 
      field: 'total_materias', 
      headerName: 'Materias', 
      width: 100, 
      type: 'number'
    },
    { 
      field: 'creado_en', 
      headerName: 'Creado', 
      width: 180,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleString('es-ES')
      }
    },
    { 
      field: 'procesado_en', 
      headerName: 'Procesado', 
      width: 180,
      valueFormatter: (params) => {
        return params.value ? new Date(params.value).toLocaleString('es-ES') : 'Pendiente'
      }
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inscripciones (Boletas)
      </Typography>
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={inscripciones}
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

export default Inscripciones
