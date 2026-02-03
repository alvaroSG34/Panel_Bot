import { Outlet } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Avatar, Menu, MenuItem } from '@mui/material'
import { Menu as MenuIcon, Dashboard as DashboardIcon, People as PeopleIcon, Assignment as AssignmentIcon, Group as GroupIcon, Person as PersonIcon, Article as ArticleIcon, CloudUpload as CloudUploadIcon, Logout as LogoutIcon, MonitorHeart as MonitorHeartIcon } from '@mui/icons-material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BotStatusWidget from './BotStatusWidget'

const drawerWidth = 240

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const navigate = useNavigate()
  const { user, logout, hasRole } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['admin', 'operator', 'auditor'] },
    { text: 'Estudiantes', icon: <PeopleIcon />, path: '/estudiantes', roles: ['admin', 'operator', 'auditor'] },
    { text: 'Inscripciones', icon: <AssignmentIcon />, path: '/inscripciones', roles: ['admin', 'operator', 'auditor'] },
    { text: 'Monitor del Bot', icon: <MonitorHeartIcon />, path: '/bot-monitor', roles: ['admin', 'operator'] },
    { text: 'Grupos y Materias', icon: <GroupIcon />, path: '/grupos-materias', roles: ['admin'] },
    { text: 'Usuarios', icon: <PersonIcon />, path: '/usuarios', roles: ['admin'] },
    { text: 'Logs', icon: <ArticleIcon />, path: '/logs', roles: ['admin', 'operator', 'auditor'] },
    { text: 'Importar CSV', icon: <CloudUploadIcon />, path: '/semillas', roles: ['admin'] },
  ]

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Bot WhatsApp
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems
          .filter(item => hasRole(item.roles))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton onClick={() => navigate(item.path)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Panel de Administración
          </Typography>
          
          <BotStatusWidget />
          
          <IconButton onClick={handleProfileMenuOpen} sx={{ ml: 2 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2">{user?.username}</Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                Rol: {user?.role}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}

export default Layout
