import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton } from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import api from '../api/axios'

const GruposMaterias = () => {
  const [tab, setTab] = useState(0)
  const [materias, setMaterias] = useState([])
  const [grupos, setGrupos] = useState([])
  const [mapeos, setMapeos] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialogs
  const [openMateriaDialog, setOpenMateriaDialog] = useState(false)
  const [openGrupoDialog, setOpenGrupoDialog] = useState(false)
  const [materiaForm, setMateriaForm] = useState({ codigo_materia: '', nombre_materia: '' })
  const [grupoForm, setGrupoForm] = useState({ codigo_grupo: '' })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [materiasRes, gruposRes, mapeosRes] = await Promise.all([
        api.get('/grupos-materias/materias'),
        api.get('/grupos-materias/grupos'),
        api.get('/grupos-materias/mapeos')
      ])
      setMaterias(materiasRes.data)
      setGrupos(gruposRes.data)
      setMapeos(mapeosRes.data)
    } catch (error) {
      console.error('Error al obtener datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMateria = async () => {
    try {
      await api.post('/grupos-materias/materias', materiaForm)
      setOpenMateriaDialog(false)
      setMateriaForm({ codigo_materia: '', nombre_materia: '' })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear materia')
    }
  }

  const handleDeleteMateria = async (id) => {
    if (window.confirm('¿Está seguro de eliminar esta materia?')) {
      try {
        await api.delete(`/grupos-materias/materias/${id}`)
        fetchData()
      } catch (error) {
        alert(error.response?.data?.message || 'Error al eliminar materia')
      }
    }
  }

  const handleCreateGrupo = async () => {
    try {
      await api.post('/grupos-materias/grupos', grupoForm)
      setOpenGrupoDialog(false)
      setGrupoForm({ codigo_grupo: '' })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear grupo')
    }
  }

  const handleDeleteGrupo = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este grupo?')) {
      try {
        await api.delete(`/grupos-materias/grupos/${id}`)
        fetchData()
      } catch (error) {
        alert(error.response?.data?.message || 'Error al eliminar grupo')
      }
    }
  }

  const materiasColumns = [
    { field: 'codigo_materia', headerName: 'Código', width: 120 },
    { field: 'nombre', headerName: 'Nombre', width: 300 },
    { 
      field: 'creado_en', 
      headerName: 'Creado', 
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString('es-ES')
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleDeleteMateria(params.row.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  const gruposColumns = [
    { field: 'codigo_grupo', headerName: 'Código', width: 120 },
    { 
      field: 'creado_en', 
      headerName: 'Creado', 
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString('es-ES')
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleDeleteGrupo(params.row.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  const mapeosColumns = [
    { 
      field: 'codigo_materia', 
      headerName: 'Materia', 
      width: 120,
      valueGetter: (params) => params.row.materias?.codigo_materia
    },
    { 
      field: 'nombre_materia', 
      headerName: 'Nombre Materia', 
      width: 250,
      valueGetter: (params) => params.row.materias?.nombre
    },
    { 
      field: 'codigo_grupo', 
      headerName: 'Grupo', 
      width: 100,
      valueGetter: (params) => params.row.grupos?.codigo_grupo
    },
    { field: 'jid_grupo_whatsapp', headerName: 'WhatsApp JID', width: 250 },
    { 
      field: 'codigo_semestre', 
      headerName: 'Semestre', 
      width: 120,
      valueGetter: (params) => params.row.semestres?.codigo
    },
  ]

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Grupos y Materias
      </Typography>
      
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
          <Tab label="Materias" />
          <Tab label="Grupos" />
          <Tab label="Mapeos (Materia-Grupo-WhatsApp)" />
        </Tabs>
        
        <Box sx={{ p: 2 }}>
          {tab === 0 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenMateriaDialog(true)}>
                  Nueva Materia
                </Button>
              </Box>
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={materias}
                  columns={materiasColumns}
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  loading={loading}
                  localeText={esES.components.MuiDataGrid.defaultProps.localeText}
                  disableSelectionOnClick
                  sx={{ border: 'none' }}
                />
              </Box>
            </>
          )}
          {tab === 1 && (
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenGrupoDialog(true)}>
                  Nuevo Grupo
                </Button>
              </Box>
              <Box sx={{ height: 600 }}>
                <DataGrid
                  rows={grupos}
                  columns={gruposColumns}
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  loading={loading}
                  localeText={esES.components.MuiDataGrid.defaultProps.localeText}
                  disableSelectionOnClick
                  sx={{ border: 'none' }}
                />
              </Box>
            </>
          )}
          {tab === 2 && (
            <Box sx={{ height: 600 }}>
              <DataGrid
                rows={mapeos}
                columns={mapeosColumns}
                pageSize={10}
                rowsPerPageOptions={[10, 25, 50]}
                loading={loading}
                localeText={esES.components.MuiDataGrid.defaultProps.localeText}
                disableSelectionOnClick
                sx={{ border: 'none' }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Dialog para crear materia */}
      <Dialog open={openMateriaDialog} onClose={() => setOpenMateriaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Materia</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Código de Materia"
            fullWidth
            value={materiaForm.codigo_materia}
            onChange={(e) => setMateriaForm({ ...materiaForm, codigo_materia: e.target.value })}
            placeholder="Ej: INF412"
          />
          <TextField
            margin="dense"
            label="Nombre de Materia"
            fullWidth
            value={materiaForm.nombre_materia}
            onChange={(e) => setMateriaForm({ ...materiaForm, nombre_materia: e.target.value })}
            placeholder="Ej: Programación III"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMateriaDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateMateria} variant="contained" disabled={!materiaForm.codigo_materia || !materiaForm.nombre_materia}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para crear grupo */}
      <Dialog open={openGrupoDialog} onClose={() => setOpenGrupoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Grupo</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Código de Grupo"
            fullWidth
            value={grupoForm.codigo_grupo}
            onChange={(e) => setGrupoForm({ ...grupoForm, codigo_grupo: e.target.value })}
            placeholder="Ej: 5A"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGrupoDialog(false)}>Cancelar</Button>
          <Button onClick={handleCreateGrupo} variant="contained" disabled={!grupoForm.codigo_grupo}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GruposMaterias
