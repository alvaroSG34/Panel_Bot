import { useEffect, useState } from 'react'
import { 
  Box, Typography, Paper, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Button, Grid, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Chip, Alert, TextField
} from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import { Visibility as VisibilityIcon, Launch as LaunchIcon, Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material'
import api from '../api/axios'

const Estudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEstudiante, setSelectedEstudiante] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [boletaDetailOpen, setBoletaDetailOpen] = useState(false)
  const [selectedBoleta, setSelectedBoleta] = useState(null)
  const [boletaDetailLoading, setBoletaDetailLoading] = useState(false)
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const fetchEstudiantes = async () => {
      try {
        // Construir query params
        const params = new URLSearchParams()
        if (searchTerm) params.append('search', searchTerm)
        
        const response = await api.get(`/estudiantes?${params.toString()}`)
        const estudiantesData = response.data?.data || response.data
        setEstudiantes(Array.isArray(estudiantesData) ? estudiantesData : [])
      } catch (error) {
        console.error('Error al obtener estudiantes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEstudiantes()
    const interval = setInterval(fetchEstudiantes, 30000) // Poll cada 30s

    return () => clearInterval(interval)
  }, [searchTerm])

  const handleViewDetail = async (id) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const response = await api.get(`/estudiantes/${id}`)
      setSelectedEstudiante(response.data)
    } catch (error) {
      console.error('Error al obtener detalle:', error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCloseDetail = () => {
    setDetailOpen(false)
    setSelectedEstudiante(null)
  }

  const handleViewBoletaDetail = async (boletaId) => {
    setBoletaDetailLoading(true)
    setBoletaDetailOpen(true)
    try {
      const response = await api.get(`/boletas/${boletaId}`)
      setSelectedBoleta(response.data)
    } catch (error) {
      console.error('Error al obtener detalle de boleta:', error)
    } finally {
      setBoletaDetailLoading(false)
    }
  }

  const handleCloseBoletaDetail = () => {
    setBoletaDetailOpen(false)
    setSelectedBoleta(null)
  }

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

  const columns = [
    { field: 'numero_registro', headerName: 'Registro', width: 120 },
    { field: 'nombre_estudiante', headerName: 'Nombre', width: 250 },
    { field: 'id_whatsapp', headerName: 'WhatsApp ID', width: 200 },
    { field: 'total_materias_registradas', headerName: 'Materias', width: 100, type: 'number' },
    { 
      field: 'creado_en', 
      headerName: 'Registrado', 
      width: 180,
      valueFormatter: (params) => {
        return new Date(params.value).toLocaleString('es-ES')
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
          Estudiantes
        </Typography>
        <Button
          variant={showSearch ? "contained" : "outlined"}
          startIcon={showSearch ? <ClearIcon /> : <SearchIcon />}
          onClick={() => setShowSearch(!showSearch)}
        >
          {showSearch ? 'Ocultar Búsqueda' : 'Buscar'}
        </Button>
      </Box>

      {/* Panel de Búsqueda */}
      {showSearch && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={10}>
              <TextField
                fullWidth
                label="Buscar Estudiante"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por registro, nombre o WhatsApp ID..."
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setSearchTerm('')}
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

      {/* Dialog de Detalle */}
      <Dialog 
        open={detailOpen} 
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalle de Estudiante #{selectedEstudiante?.id}
        </DialogTitle>
        <DialogContent>
          {detailLoading ? (
            <Typography>Cargando...</Typography>
          ) : selectedEstudiante ? (
            <Box sx={{ mt: 2 }}>
              {/* Información del Estudiante */}
              <Typography variant="h6" gutterBottom>
                Información Personal
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Número de Registro
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedEstudiante.numero_registro}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Nombre
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedEstudiante.nombre_estudiante}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    WhatsApp ID
                  </Typography>
                  <Typography variant="body1">
                    {selectedEstudiante.id_whatsapp}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Materias Registradas
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {selectedEstudiante.total_materias_registradas || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Registrado en el Sistema
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedEstudiante.creado_en).toLocaleString('es-ES')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Última Actualización
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedEstudiante.actualizado_en).toLocaleString('es-ES')}
                  </Typography>
                </Grid>
              </Grid>

              {/* Historial de Inscripciones */}
              <Typography variant="h6" gutterBottom>
                Historial de Inscripciones ({selectedEstudiante.boletas_inscripciones?.length || 0})
              </Typography>
              {selectedEstudiante.boletas_inscripciones && selectedEstudiante.boletas_inscripciones.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Semestre</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell>Materias</TableCell>
                        <TableCell>Fecha Subida</TableCell>
                        <TableCell>Procesado</TableCell>
                        <TableCell>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedEstudiante.boletas_inscripciones.map((boleta) => (
                        <TableRow key={boleta.id}>
                          <TableCell>{boleta.id}</TableCell>
                          <TableCell>
                            {boleta.semestres?.nombre || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={boleta.estado} 
                              color={getEstadoColor(boleta.estado)} 
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {boleta.boleta_grupo?.length || 0}
                          </TableCell>
                          <TableCell>
                            {new Date(boleta.fecha_subida).toLocaleDateString('es-ES')}
                          </TableCell>
                          <TableCell>
                            {boleta.procesado_en 
                              ? new Date(boleta.procesado_en).toLocaleDateString('es-ES')
                              : 'Pendiente'}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="primary"
                              onClick={() => handleViewBoletaDetail(boleta.id)}
                              size="small"
                              title="Ver detalle completo"
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No hay inscripciones registradas
                </Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Detalle de Boleta/Inscripción */}
      <Dialog 
        open={boletaDetailOpen} 
        onClose={handleCloseBoletaDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalle de Inscripción #{selectedBoleta?.id}
        </DialogTitle>
        <DialogContent>
          {boletaDetailLoading ? (
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
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBoletaDetail}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Estudiantes
