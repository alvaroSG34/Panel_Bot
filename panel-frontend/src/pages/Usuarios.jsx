import { useEffect, useState } from 'react'
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Chip } from '@mui/material'
import { DataGrid, esES } from '@mui/x-data-grid'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import api from '../api/axios'

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'operator'
  })

  useEffect(() => {
    fetchUsuarios()
    const interval = setInterval(fetchUsuarios, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUsuarios = async () => {
    try {
      const response = await api.get('/usuarios')
      // Si la respuesta tiene un objeto con data, extraerlo; si no, usar la respuesta directamente
      const usuariosData = response.data?.data || response.data
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : [])
    } catch (error) {
      console.error('Error al obtener usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        password: '',
        email: user.email || '',
        role: user.role
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        password: '',
        email: '',
        role: 'operator'
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
  }

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password
        }
        await api.put(`/usuarios/${editingUser.id}`, updateData)
      } else {
        await api.post('/usuarios', formData)
      }
      fetchUsuarios()
      handleCloseDialog()
    } catch (error) {
      console.error('Error al guardar usuario:', error)
      alert(error.response?.data?.message || 'Error al guardar usuario')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await api.delete(`/usuarios/${id}`)
        fetchUsuarios()
      } catch (error) {
        console.error('Error al eliminar usuario:', error)
        alert(error.response?.data?.message || 'Error al eliminar usuario')
      }
    }
  }

  const columns = [
    { field: 'username', headerName: 'Usuario', width: 200 },
    { field: 'email', headerName: 'Email', width: 200 },
    { 
      field: 'role', 
      headerName: 'Rol', 
      width: 130,
      renderCell: (params) => {
        const colors = { admin: 'error', operator: 'primary', auditor: 'success' }
        return <Chip label={params.value} color={colors[params.value]} size="small" />
      }
    },
    { 
      field: 'activo', 
      headerName: 'Estado', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Activo' : 'Inactivo'} 
          color={params.value ? 'success' : 'default'} 
          size="small"
        />
      )
    },
    { 
      field: 'creado_en', 
      headerName: 'Creado', 
      width: 180,
      valueFormatter: (params) => new Date(params.value).toLocaleString('es-ES')
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton size="small" onClick={() => handleOpenDialog(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.row.id)} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Usuarios</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Nuevo Usuario
        </Button>
      </Box>
      
      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={usuarios}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          localeText={esES.components.MuiDataGrid.defaultProps.localeText}
          disableSelectionOnClick
          sx={{ border: 'none' }}
        />
      </Paper>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre de Usuario"
            fullWidth
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            disabled={!!editingUser}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <TextField
            margin="dense"
            label={editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password"
            fullWidth
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
          />
          <TextField
            select
            margin="dense"
            label="Rol"
            fullWidth
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <MenuItem value="admin">Administrador</MenuItem>
            <MenuItem value="operator">Operador</MenuItem>
            <MenuItem value="auditor">Auditor</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Usuarios
