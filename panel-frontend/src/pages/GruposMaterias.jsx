import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Tabs, Tab, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, MenuItem } from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import api from '../api/axios'

const GruposMaterias = () => {
  const [tab, setTab] = useState(0)
  const [materias, setMaterias] = useState([])
  const [grupos, setGrupos] = useState([])
  const [mapeos, setMapeos] = useState([])
  const [semestres, setSemestres] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Dialogs
  const [openMateriaDialog, setOpenMateriaDialog] = useState(false)
  const [openGrupoDialog, setOpenGrupoDialog] = useState(false)
  const [openMapeoDialog, setOpenMapeoDialog] = useState(false)
  const [materiaForm, setMateriaForm] = useState({ codigo_materia: '', nombre_materia: '' })
  const [grupoForm, setGrupoForm] = useState({ codigo_grupo: '' })
  const [mapeoForm, setMapeoForm] = useState({ 
    id_semestre: '', 
    id_materia: '', 
    id_grupo: '', 
    jid_grupo_whatsapp: '',
    modalidad: '',
    horario: ''
  })

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [materiasRes, gruposRes, mapeosRes, semestresRes] = await Promise.all([
        api.get('/grupos-materias/materias'),
        api.get('/grupos-materias/grupos'),
        api.get('/grupos-materias/mapeos'),
        api.get('/grupos-materias/semestres')
      ])
      const materiasData = materiasRes.data?.data || materiasRes.data
      const gruposData = gruposRes.data?.data || gruposRes.data
      const mapeosData = mapeosRes.data?.data || mapeosRes.data
      const semestresData = semestresRes.data?.data || semestresRes.data
      
      setMaterias(Array.isArray(materiasData) ? materiasData : [])
      setGrupos(Array.isArray(gruposData) ? gruposData : [])
      setMapeos(Array.isArray(mapeosData) ? mapeosData : [])
      setSemestres(Array.isArray(semestresData) ? semestresData : [])
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

  const handleCreateMapeo = async () => {
    try {
      await api.post('/grupos-materias/mapeos', {
        id_semestre: parseInt(mapeoForm.id_semestre),
        id_materia: parseInt(mapeoForm.id_materia),
        id_grupo: parseInt(mapeoForm.id_grupo),
        jid_grupo_whatsapp: mapeoForm.jid_grupo_whatsapp,
        modalidad: mapeoForm.modalidad || undefined,
        horario: mapeoForm.horario || undefined
      })
      setOpenMapeoDialog(false)
      setMapeoForm({ id_semestre: '', id_materia: '', id_grupo: '', jid_grupo_whatsapp: '', modalidad: '', horario: '' })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Error al crear mapeo')
    }
  }

  const handleDeleteMapeo = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este mapeo?')) {
      try {
        await api.delete(`/grupos-materias/mapeos/${id}`)
        fetchData()
      } catch (error) {
        alert(error.response?.data?.message || 'Error al eliminar mapeo')
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
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <IconButton size="small" onClick={() => handleDeleteMapeo(params.row.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
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
            <>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenMapeoDialog(true)}>
                  Nuevo Mapeo
                </Button>
              </Box>
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
            </>
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

      {/* Dialog para crear mapeo */}
      <Dialog open={openMapeoDialog} onClose={() => setOpenMapeoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Mapeo Materia-Grupo-WhatsApp</DialogTitle>
        <DialogContent>
          <TextField
            select
            margin="dense"
            label="Semestre"
            fullWidth
            value={mapeoForm.id_semestre}
            onChange={(e) => setMapeoForm({ ...mapeoForm, id_semestre: e.target.value })}
          >
            {semestres.map((sem) => (
              <MenuItem key={sem.id} value={sem.id}>
                {sem.codigo} - {sem.nombre || 'Sin nombre'}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            margin="dense"
            label="Materia"
            fullWidth
            value={mapeoForm.id_materia}
            onChange={(e) => setMapeoForm({ ...mapeoForm, id_materia: e.target.value })}
          >
            {materias.map((mat) => (
              <MenuItem key={mat.id} value={mat.id}>
                {mat.codigo_materia} - {mat.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            margin="dense"
            label="Grupo"
            fullWidth
            value={mapeoForm.id_grupo}
            onChange={(e) => setMapeoForm({ ...mapeoForm, id_grupo: e.target.value })}
          >
            {grupos.map((grp) => (
              <MenuItem key={grp.id} value={grp.id}>
                {grp.codigo_grupo}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="WhatsApp Group JID"
            fullWidth
            value={mapeoForm.jid_grupo_whatsapp}
            onChange={(e) => setMapeoForm({ ...mapeoForm, jid_grupo_whatsapp: e.target.value })}
            placeholder="Ej: 120363123456789012@g.us"
            helperText="ID del grupo de WhatsApp (obtenible con npm run discover-groups)"
          />
          <TextField
            margin="dense"
            label="Modalidad (Opcional)"
            fullWidth
            value={mapeoForm.modalidad}
            onChange={(e) => setMapeoForm({ ...mapeoForm, modalidad: e.target.value })}
            placeholder="Ej: Presencial, Virtual"
          />
          <TextField
            margin="dense"
            label="Horario (Opcional)"
            fullWidth
            multiline
            rows={2}
            value={mapeoForm.horario}
            onChange={(e) => setMapeoForm({ ...mapeoForm, horario: e.target.value })}
            placeholder="Ej: Lunes y Miércoles 14:30-16:00"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMapeoDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleCreateMapeo} 
            variant="contained" 
            disabled={!mapeoForm.id_semestre || !mapeoForm.id_materia || !mapeoForm.id_grupo || !mapeoForm.jid_grupo_whatsapp}
          >
            Crear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GruposMaterias
