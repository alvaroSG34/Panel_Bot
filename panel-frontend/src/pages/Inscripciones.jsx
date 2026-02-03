import { useEffect, useState } from 'react'
import { 
  Box, Typography, Paper, Chip, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Grid, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Select, MenuItem,
  FormControl, InputLabel, Alert, TextField
} from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import { Visibility as VisibilityIcon, FilterList as FilterListIcon, Clear as ClearIcon } from '@mui/icons-material'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'

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
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBoleta, setSelectedBoleta] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newEstado, setNewEstado] = useState('')
  const { user } = useAuth()

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    estado: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const canChangeEstado = user?.role === 'admin' || user?.role === 'operator'

  useEffect(() => {
    const fetchInscripciones = async () => {
      try {
        // Construir query params
        const params = new URLSearchParams()
        if (filters.search) params.append('search', filters.search)
        if (filters.estado) params.append('estado', filters.estado)
        
        const response = await api.get(`/boletas?${params.toString()}`)
        const inscripcionesData = response.data?.data || response.data
        setInscripciones(Array.isArray(inscripcionesData) ? inscripcionesData : [])
      } catch (error) {
        console.error('Error al obtener inscripciones:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInscripciones()
    const interval = setInterval(fetchInscripciones, 30000) // Poll cada 30s

    return () => clearInterval(interval)
  }, [filters])

  const handleViewDetail = async (id) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const response = await api.get(`/boletas/${id}`)
      setSelectedBoleta(response.data)
      setNewEstado(response.data.estado)
    } catch (error) {
      console.error('Error al obtener detalle:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseDetail = () => {
    setDetailOpen(false)
    setSelectedBoleta(null)
    setNewEstado('')
  }

  const handleChangeEstado = async () => {
    if (!selectedBoleta || !newEstado) return
    
    try {
      await api.patch(`/boletas/${selectedBoleta.id}/estado`, { estado: newEstado })
      // Actualizar lista
      const response = await api.get('/boletas')
      const inscripcionesData = response.data?.data || response.data
      setInscripciones(Array.isArray(inscripcionesData) ? inscripcionesData : [])
      handleCloseDetail()
    } catch (error) {
      console.error('Error al cambiar estado:', error)
      alert('Error al cambiar estado: ' + (error.response?.data?.message || error.message))
    }
  }

  const columns = [
    { 
      field: 'id',
      headerName: 'ID',
      width: 70
    },
    { 
      field: 'numero_registro', 
      headerName: 'Registro', 
      width: 120,
      valueGetter: (params) => params.row.estudiantes?.numero_registro || 'N/A'
    },
    { 
      field: 'nombre_estudiante', 
      headerName: 'Estudiante', 
      width: 200,
      valueGetter: (params) => params.row.estudiantes?.nombre_estudiante || 'N/A'
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
      type: 'number',
      valueGetter: (params) => params.row.boleta_grupo?.length || 0
    },
    { 
      field: 'fecha_subida', 
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
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          color="primary"
          onClick={() => handleViewDetail(params.row.id)}
          size="small"
        >
          <VisibilityIcon />
        </IconButton>
      )
    }
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Inscripciones (Boletas)
        </Typography>
        <Button
          variant={showFilters ? "contained" : "outlined"}
          startIcon={showFilters ? <ClearIcon /> : <FilterListIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </Button>
      </Box>

      {/* Panel de Filtros */}
      {showFilters && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Buscar (Registro o Nombre)"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Ej: 222009969 o SONCO"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.estado}
                  label="Estado"
                  onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendiente">Pendiente</MenuItem>
                  <MenuItem value="confirmado">Confirmado</MenuItem>
                  <MenuItem value="procesando">Procesando</MenuItem>
                  <MenuItem value="completado">Completado</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setFilters({ search: '', estado: '' })}
                sx={{ height: '56px' }}
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

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

      {/* Dialog de Detalle */}
      <Dialog 
        open={detailOpen} 
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalle de Inscripción #{selectedBoleta?.id}
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Typography>Cargando...</Typography>
          ) : selectedBoleta ? (
            <Box sx={{ mt: 2 }}>
              {/* Información del Estudiante */}
              <Typography variant="h6" gutterBottom>
                Información del Estudiante
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Número de Registro
                  </Typography>
                  <Typography variant="body1">
                    {selectedBoleta.estudiantes?.numero_registro || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Nombre
                  </Typography>
                  <Typography variant="body1">
                    {selectedBoleta.estudiantes?.nombre_estudiante || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Semestre
                  </Typography>
                  <Typography variant="body1">
                    {selectedBoleta.semestres?.nombre || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    WhatsApp ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedBoleta.estudiantes?.id_whatsapp || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>

              {/* Estado */}
              <Typography variant="h6" gutterBottom>
                Estado de la Inscripción
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estado Actual
                  </Typography>
                  <Chip 
                    label={selectedBoleta.estado} 
                    color={getEstadoColor(selectedBoleta.estado)} 
                    sx={{ mt: 1 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Procesado
                  </Typography>
                  <Typography variant="body1">
                    {selectedBoleta.procesado_en 
                      ? new Date(selectedBoleta.procesado_en).toLocaleString('es-ES')
                      : 'Pendiente'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Subida
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedBoleta.fecha_subida).toLocaleString('es-ES')}
                  </Typography>
                </Grid>
              </Grid>

              {/* Mensajes de Error */}
              {selectedBoleta.mensaje_error && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="error">
                    <Typography variant="body2" fontWeight="bold">
                      Error:
                    </Typography>
                    <Typography variant="body2">
                      {selectedBoleta.mensaje_error}
                    </Typography>
                  </Alert>
                </Box>
              )}

              {/* Materias Inscritas */}
              <Typography variant="h6" gutterBottom>
                Materias Inscritas ({selectedBoleta.boleta_grupo?.length || 0})
              </Typography>
              {selectedBoleta.boleta_grupo && selectedBoleta.boleta_grupo.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Sigla</TableCell>
                        <TableCell>Materia</TableCell>
                        <TableCell>Grupo</TableCell>
                        <TableCell>Semestre</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedBoleta.boleta_grupo.map((bg, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {bg.grupo_materia?.materias?.codigo_materia || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {bg.grupo_materia?.materias?.nombre || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {bg.grupo_materia?.grupos?.codigo_grupo || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {bg.grupo_materia?.semestres?.nombre || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay materias registradas
                </Typography>
              )}

              {/* Cambiar Estado (solo admin/operator) */}
              {canChangeEstado && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cambiar Estado
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Nuevo Estado</InputLabel>
                    <Select
                      value={newEstado}
                      label="Nuevo Estado"
                      onChange={(e) => setNewEstado(e.target.value)}
                    >
                      <MenuItem value="pendiente">Pendiente</MenuItem>
                      <MenuItem value="confirmado">Confirmado</MenuItem>
                      <MenuItem value="procesando">Procesando</MenuItem>
                      <MenuItem value="completado">Completado</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>
            Cerrar
          </Button>
          {canChangeEstado && selectedBoleta && newEstado !== selectedBoleta.estado && (
            <Button 
              onClick={handleChangeEstado}
              variant="contained"
              color="primary"
            >
              Guardar Estado
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Inscripciones
