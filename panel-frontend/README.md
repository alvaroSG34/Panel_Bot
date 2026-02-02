# Panel de Administración - Bot WhatsApp Frontend

Panel web de administración para el bot de WhatsApp de inscripción de estudiantes.

## Tecnologías

- **React 18** - Biblioteca UI
- **Vite** - Build tool y dev server
- **Material-UI (MUI) 5** - Componentes UI
- **React Router 6** - Routing
- **Axios** - Cliente HTTP
- **MUI X Data Grid** - Tablas de datos

## Instalación

```bash
cd panel-frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

El proxy está configurado para redirigir `/api` a `http://localhost:4000` (backend).

## Build de Producción

```bash
npm run build
```

Los archivos estáticos se generarán en la carpeta `dist/`.

## Estructura del Proyecto

```
src/
├── api/
│   └── axios.js              # Cliente HTTP configurado con interceptors
├── components/
│   ├── Layout.jsx            # Layout principal con sidebar y navbar
│   └── BotStatusWidget.jsx   # Widget de estado del bot
├── contexts/
│   └── AuthContext.jsx       # Context de autenticación
├── pages/
│   ├── Login.jsx             # Página de login
│   ├── Dashboard.jsx         # Dashboard con estadísticas
│   ├── Estudiantes.jsx       # Lista de estudiantes
│   ├── Inscripciones.jsx     # Lista de inscripciones (boletas)
│   ├── GruposMaterias.jsx    # Gestión de grupos y materias
│   ├── Usuarios.jsx          # Gestión de usuarios (solo admin)
│   ├── Logs.jsx              # Visor de logs del bot
│   └── Semillas.jsx          # Importación CSV (solo admin)
├── routes/
│   └── index.jsx             # Configuración de rutas
├── App.jsx                   # Componente raíz
├── main.jsx                  # Entry point
└── index.css                 # Estilos globales
```

## Características

### Autenticación
- Login con JWT tokens
- Refresh token automático
- Rutas protegidas por rol (admin, operator, auditor)
- Logout con limpieza de tokens

### Polling Automático
- Todas las páginas hacen polling cada 30 segundos
- Actualización automática de datos sin recargar la página

### Roles y Permisos
- **Admin**: Acceso completo (CRUD usuarios, importar CSV, ver todo)
- **Operator**: Solo lectura (ver estudiantes, inscripciones, logs)
- **Auditor**: Solo lectura (similar a operator)

### Páginas

#### Dashboard
- Estadísticas en tiempo real
- Total de estudiantes, inscripciones, completadas y pendientes

#### Estudiantes
- Listado completo con DataGrid
- Información: registro, nombre, carrera, WhatsApp ID, materias inscritas

#### Inscripciones (Boletas)
- Listado de todas las boletas procesadas
- Estados: pendiente, confirmado, procesando, completado, error
- Chips de colores según estado

#### Grupos y Materias
- 3 tabs: Materias, Grupos, Mapeos
- Visualización de relaciones materia-grupo-WhatsApp

#### Usuarios (Solo Admin)
- CRUD completo de usuarios
- Asignación de roles
- Activación/desactivación de usuarios

#### Logs
- Visor de logs del bot en tiempo real
- Configurable número de líneas
- Actualización automática cada 30s
- Información del archivo de logs

#### Importar CSV (Solo Admin)
- Wizard de 4 pasos
- 3 tipos: estudiantes, grupos, mapeos
- Vista previa con dry-run
- Modo tolerante para continuar con errores
- Validación y reporte de errores

## Variables de Entorno

No se requieren variables de entorno. El proxy está configurado en `vite.config.js`.

## Notas

- **Solo español**: Toda la UI está en español
- **Sin i18n**: No se requiere internacionalización
- **Sin modo offline**: No hay service workers ni cache
- **Polling**: Se usa polling cada 30s en lugar de WebSockets
- **Refresh token automático**: El interceptor de axios maneja la renovación automática del token

## Desarrollo Futuro

Posibles mejoras:
- Filtros avanzados en DataGrids
- Exportar datos a Excel/CSV
- Gráficos de estadísticas (Chart.js)
- Notificaciones toast para operaciones CRUD
- Dark mode toggle
