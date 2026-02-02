# Panel Administrativo - WhatsApp Enrollment Bot

Panel administrativo con control de acceso basado en roles (RBAC) para gestionar el sistema de inscripción automatizada de estudiantes a grupos de WhatsApp.

## 🎯 Características

- **Multi-Usuario RBAC**: 3 roles (Admin, Operator, Auditor)
- **Autenticación JWT**: Access tokens (15min) + Refresh tokens (7 días)
- **Optimistic Locking**: Prevención de conflictos en ediciones concurrentes con UI de diff
- **CSV Import Wizard**: Importación masiva con pre-validación y modo tolerante
- **Bot Command System**: Reintentos, refresh de grupos, reinicio graceful con crash recovery
- **Audit Logging**: Retención de 60 días con índices compuestos para performance
- **Session Management**: Force logout, revocación de tokens, limpieza automática
- **Multi-Instance Detection**: Alertas si múltiples bots están corriendo

## 📋 Prerequisites

- **Node.js** 18+ 
- **PostgreSQL** 14+ con `new_schema.sql` aplicado (incluye tablas del panel)
- **PM2** (instalado globalmente): `npm install -g pm2`
- **Bot de WhatsApp** corriendo en `d:\BotWhatsapp`

## 🚀 Instalación

### 1. Aplicar Schema de Base de Datos

```powershell
# Aplicar el esquema extendido con tablas del panel
psql "postgresql://neondb_owner:npg_Laq3RGdpT2sN@ep-nameless-butterfly-achcdeyz-pooler.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require" -f d:\BotWhatsapp\database\new_schema.sql
```

### 2. Instalar Dependencias

```powershell
# Root (para create-admin script)
cd d:\Panel_Bot
npm install

# Backend
cd panel-backend
npm install

# Frontend (cuando esté implementado)
cd ../panel-frontend
npm install
```

### 3. Configurar Environment Variables

```powershell
# Backend: copiar .env.example a .env y ajustar
cd panel-backend
copy .env.example .env
# Editar .env con tus valores (ya configurado con credenciales de Neon)
```

### 4. Crear Usuario Administrador Inicial

```powershell
# Desde la raíz del proyecto Panel_Bot
npm run create-admin
```

Sigue las instrucciones interactivas:
- Username (3-20 caracteres alfanuméricos)
- Password (mín 8 chars, debe incluir: minúscula, mayúscula, número)
- Confirmar password
- Email (opcional)

**Importante**: Solo se puede crear UN administrador con este script. Usuarios adicionales se gestionan desde el panel web.

### 5. Configurar Prisma (Generar Modelos)

```powershell
cd panel-backend

# IMPORTANTE: Prisma 7 requiere que el datasource NO tenga 'url' en schema.prisma
# La URL ya está configurada en prisma.config.ts

# Introspect database y generar modelos TypeScript
npx prisma db pull

# Generar Prisma Client
npx prisma generate
```

**Nota**: Si ves el error `The datasource property 'url' is no longer supported`, elimina la línea `url = env("DATABASE_URL")` del archivo `prisma/schema.prisma`. En Prisma 7, la URL se configura en `prisma.config.ts`.

## 🏗️ Estructura del Proyecto

```
Panel_Bot/
├── create-admin.js          # CLI para crear administrador inicial
├── package.json             # Dependencias del script create-admin
│
├── panel-backend/           # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                # JWT + Sessions + RBAC Guards
│   │   │   ├── usuarios/            # CRUD usuarios con optimistic lock
│   │   │   ├── estudiantes/         # Read-only para todos los roles
│   │   │   ├── boletas/             # Gestión documentos inscripción
│   │   │   ├── grupos-materias/     # CRUD ofertas (admin only)
│   │   │   ├── admin-commands/      # Cola de comandos para bot
│   │   │   ├── bot-status/          # Heartbeat y multi-instance detection
│   │   │   ├── seeding/             # CSV import wizard
│   │   │   └── logs/                # Streaming de logs del bot
│   │   ├── common/
│   │   │   ├── guards/              # RolesGuard, SessionGuard, OptimisticLockGuard
│   │   │   ├── interceptors/        # AuditInterceptor
│   │   │   └── decorators/          # @Roles(), @AuditTable()
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma            # Modelos generados desde DB
│   ├── .env                         # Configuración (no committed)
│   └── package.json
│
└── panel-frontend/          # React + Vite + Material-UI (por implementar)
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx        # Métricas + bot status
    │   │   ├── Students.tsx         # DataGrid estudiantes
    │   │   ├── Enrollments.tsx      # DataGrid boletas
    │   │   ├── GroupMappings.tsx    # CRUD ofertas (admin)
    │   │   ├── Users.tsx            # Gestión usuarios (admin)
    │   │   ├── Settings.tsx         # Restart bot, configs (admin)
    │   │   └── Logs.tsx             # Real-time log viewer
    │   ├── contexts/
    │   │   └── AuthContext.tsx      # Login/logout/refresh logic
    │   ├── components/
    │   │   ├── SeedingWizard.tsx    # CSV import steps
    │   │   └── DiffModal.tsx        # Optimistic lock conflict resolution
    │   └── App.tsx
    └── package.json
```

## 🔐 Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Admin** | Full CRUD en todas las tablas, gestión de usuarios, reset passwords, force logout, restart bot, CSV imports |
| **Operator** | Read-only en estudiantes/boletas/ofertas, puede ver logs (filtrados) |
| **Auditor** | Read-only en todas las tablas, acceso completo a audit logs, no puede modificar nada |

## 🛠️ Desarrollo

### Backend (NestJS)

```powershell
cd panel-backend
npm run start:dev  # Inicia en localhost:3000 con hot-reload
```

**Endpoints principales**:
- `POST /api/auth/login` - Login con username/password
- `POST /api/auth/refresh` - Renovar access token
- `POST /api/auth/logout` - Revocar sesión
- `GET /api/estudiantes` - Listar estudiantes (todos los roles)
- `GET /api/boletas` - Listar documentos con filtros
- `GET /api/grupos-materias` - Listar ofertas
- `POST /api/grupos-materias` - Crear oferta (admin only)
- `PUT /api/grupos-materias/:id` - Editar con optimistic lock
- `GET /api/bot/status` - Estado del bot y heartbeat
- `GET /api/bot/instances` - Detectar múltiples instancias
- `POST /api/admin-commands` - Crear comando para bot
- `GET /api/logs/stream` - SSE log streaming

### Frontend (React + Vite)

```powershell
cd panel-frontend
npm run dev  # Inicia en localhost:5173 con proxy a :3000/api
```

**Vite config proxy**:
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

## 🚢 Producción

### Build

```powershell
# Frontend: compilar a estáticos
cd panel-frontend
npm run build
# Output: dist/ → copiar a panel-backend/public/

# Backend: compilar TypeScript
cd ../panel-backend
npm run build
# Output: dist/
```

### Configurar NestJS para servir estáticos

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Servir frontend desde /public
  app.useStaticAssets(join(__dirname, '..', 'public'));
  
  await app.listen(3000);
}
```

### PM2 Ecosystem

```javascript
// ecosystem.config.js (crear en raíz de Panel_Bot)
module.exports = {
  apps: [
    {
      name: 'whatsapp-bot',
      cwd: 'd:/BotWhatsapp',
      script: 'src/index.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'admin-panel',
      cwd: 'd:/Panel_Bot/panel-backend',
      script: 'dist/main.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

**Comandos PM2**:
```powershell
# Iniciar ambos procesos
pm2 start ecosystem.config.js

# Ver logs
pm2 logs admin-panel
pm2 logs whatsapp-bot

# Reiniciar
pm2 restart admin-panel
pm2 restart whatsapp-bot

# Guardar configuración
pm2 save

# Auto-start en Windows (requiere admin)
pm2 startup
```

## 📊 Database Schema Overview

### Tablas del Bot (existentes)
- `estudiantes` - Estudiantes con contador `total_materias_registradas`
- `semestres` - Catálogo de semestres (versionado)
- `materias` - Catálogo de materias (código único)
- `grupos` - Catálogo de grupos/secciones (SA, SB, 5A, etc.)
- `grupo_materia` - Ofertas por semestre con JID + version (optimistic locking)
- `boletas_inscripciones` - Documentos OCR con `estado_documento` ENUM
- `boleta_grupo` - Líneas de inscripción con `estado_agregado` ENUM y retry logic

### Tablas del Panel (nuevas)
- `usuarios` - Usuarios con `role` ENUM + version (optimistic locking)
- `sesiones` - Refresh tokens hasheados con expiración
- `sesiones_auditoria` - Log de acciones (retención 60 días) con índices compuestos
- `admin_commands` - Cola de comandos con locking (`bloqueado_por` PID)
- `bot_heartbeat` - Single-row table con última conexión + grupos_cache JSONB

## 🔄 Bot Command System

### Comandos Disponibles

1. **retry_enrollment**: Reintentar agregar estudiante a grupo
   ```json
   {
     "comando": "retry_enrollment",
     "parametros": {
       "id_boleta_grupo": 123
     }
   }
   ```

2. **refresh_groups**: Re-escanear grupos de WhatsApp y actualizar cache
   ```json
   {
     "comando": "refresh_groups",
     "parametros": {}
   }
   ```

3. **restart_bot**: Reinicio graceful (requiere PM2)
   ```json
   {
     "comando": "restart_bot",
     "parametros": {}
   }
   ```

### Crash Recovery

El bot al iniciar ejecuta `reclaimStaleCommands()`:
```sql
UPDATE admin_commands 
SET estado='pendiente', bloqueado_por=NULL, bloqueado_en=NULL
WHERE estado='procesando' AND bloqueado_en < NOW() - INTERVAL '5 minutes'
```

Panel muestra comandos "stale" con acciones admin:
- **Requeue**: volver a `pendiente`
- **Mark Failed**: marcar como `fallido` con nota

## 📝 CSV Import Templates

### materias.csv
```csv
codigo_materia,nombre,nivel
INF120,INTRODUCCION A LA INFORMATICA,Básico
INF412,SISTEMAS DE INFORMACION II,Profesional
MAT101,CALCULO I,Básico
```

### grupos.csv
```csv
codigo_grupo
SA
SB
5A
5B
```

### ofertas.csv
```csv
codigo_materia,codigo_grupo,jid_grupo_whatsapp,modalidad,horario
INF120,SA,120363422425868357@g.us,Virtual,Lun-Mie 08:00-10:00
INF412,5A,120363333333333333@g.us,Presencial,Mar-Jue 14:00-16:00
```

**Validaciones**:
- Duplicados en archivo: detectados, opciones de skip/upsert
- Registros existentes: modo `updateExisting` o `skipDuplicates`
- JIDs inválidos: validados contra `bot_heartbeat.grupos_cache`, modo `allowInvalidJids` permite override

## 🧪 Estado de Implementación

### ✅ Completado
- [x] Schema extendido con tablas del panel (new_schema.sql)
- [x] CLI create-admin con validaciones interactivas
- [x] Proyecto NestJS inicializado con dependencias
- [x] Configuración Prisma para introspección
- [x] Modelos Prisma generados desde base de datos (12 models)
- [x] **Auth module completo** (JWT + Sessions + Guards)
- [x] **EstudiantesModule** - Read-only con stats y búsqueda
- [x] **BoletasModule** - GET + cambio de estados (admin/operator)
- [x] **GruposMateriasModule** - CRUD completo con optimistic locking
- [x] **UsuariosModule** - CRUD + reset password + force logout
- [x] **AdminCommandsModule** - Cola de comandos para bot (CRUD + requeue + stats)
- [x] Todos los módulos registrados en app.module.ts
- [x] .gitignore actualizado

### 🔄 Próximo
- [ ] Testing de AdminCommands con test-admin-commands.js
- [ ] BotStatusModule - Heartbeat y detección multi-instancia
- [ ] LogsModule - Streaming SSE de logs del bot
- [ ] Integración en bot: pollAdminCommands() + sendHeartbeat()
- [ ] Crear datos de prueba (semestres, materias, grupos)
- [ ] Inicializar React frontend con Vite

### 📅 Pendiente
- [ ] CSV import wizard (SeedingModule)
- [ ] Bot command polling en src/index.js del bot
- [ ] PM2 ecosystem config
- [ ] Documentación de deployment

## 🐛 Troubleshooting

### Prisma no genera modelos

```powershell
# Verificar conexión a DB
npx prisma db pull

# Si falla, revisar DATABASE_URL en .env
# Debe incluir ?sslmode=require para Neon
```

### Error "tabla usuarios no existe"

```powershell
# Aplicar schema completo primero
psql "postgresql://..." -f d:\BotWhatsapp\database\new_schema.sql
```

### Múltiples instancias del bot detectadas

```powershell
# Verificar procesos corriendo
pm2 list

# Detener instancia duplicada
pm2 stop whatsapp-bot
pm2 delete whatsapp-bot
pm2 start ecosystem.config.js
```

### Optimistic lock conflict constante

```typescript
// Si dos admins editan simultáneamente, uno verá modal de diff
// Solución: comunicar entre usuarios o implementar WebSocket presence (Phase 2)
```

## 📚 Próximos Pasos

1. **Generar Prisma Models**: `npx prisma db pull && npx prisma generate`
2. **Implementar Auth Module**: JWT Strategy, Guards, Session management
3. **Crear módulos de datos**: Estudiantes, Boletas, GruposMaterias, etc.
4. **Inicializar React frontend**: Vite + Material-UI + React Query
5. **Implementar bot polling**: Modificar `src/index.js` con `pollAdminCommands()`
6. **Testing**: Crear admin, login, CRUD ofertas, reintentar enrollment
7. **Production build**: Frontend a estáticos, configurar PM2, deployment

## 📞 Soporte

Para issues y dudas, revisar:
- Logs del bot: `d:\BotWhatsapp\logs\bot.log`
- Logs del panel: `pm2 logs admin-panel`
- Audit trail: Query `sesiones_auditoria` table

---

**Última actualización**: Febrero 2026  
**Versión**: 1.0.0-alpha (en desarrollo)
