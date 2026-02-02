# Panel Administrativo - Bot WhatsApp

Panel de administración multi-usuario con RBAC para gestionar el bot de inscripción a grupos de WhatsApp.

## 🚀 Características

- **Autenticación JWT**: Access tokens (15 min) + Refresh tokens (7 días)
- **RBAC**: 3 roles (admin, operator, auditor) con permisos granulares
- **Auditoría**: Logging automático de todas las mutaciones con before/after JSON
- **Rate Limiting**: Protección contra ataques de fuerza bruta
- **Optimistic Locking**: Prevención de conflictos en actualizaciones concurrentes
- **Gestión de Sesiones**: Force logout, tracking de IP/User-Agent, revocación de tokens

## 📋 Requisitos

- Node.js 18+
- PostgreSQL 14+
- npm o pnpm

## 🛠️ Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

El archivo `.env` ya está configurado con:
- DATABASE_URL: Conexión a PostgreSQL (Neon)
- JWT_SECRET: Clave secreta para tokens
- CORS_ORIGIN: Origen permitido para CORS

### 3. Sincronizar Prisma con la base de datos

```bash
npx prisma db pull
npx prisma generate
```

## 🎯 Uso

### Iniciar servidor en desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

### Iniciar servidor en producción

```bash
npm run build
npm run start:prod
```

## 🧪 Testing

### Probar autenticación completa

Asegúrate de que el servidor esté corriendo, luego:

```bash
cd ..
npm run test-auth
```

Este script prueba:
1. Login con usuario admin
2. Refresh token
3. Logout
4. Validación de token revocado

## 📚 API Endpoints

### POST /auth/login
Login de usuario. Rate limit: 5 intentos cada 15 minutos.

**Request:**
```json
{
  "username": "Uagrmbot",
  "password": "Admin2026!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "a8f3d2c1...",
  "user": {
    "id": 1,
    "username": "Uagrmbot",
    "email": "admin@uagrm.edu.bo",
    "role": "admin"
  }
}
```

### POST /auth/refresh
Refrescar access token. Rate limit: 10 intentos por minuto.

**Request:**
```json
{
  "refreshToken": "a8f3d2c1..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGc..."
}
```

### POST /auth/logout
Cerrar sesión (requiere autenticación).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "refreshToken": "a8f3d2c1..."
}
```

## 🔒 Guards y Decoradores

### Guards

- **JwtAuthGuard**: Valida JWT en header Authorization
- **RolesGuard**: Verifica roles de usuario
- **SessionGuard**: Valida que la sesión no esté revocada

### Decoradores

- `@Roles('admin', 'operator')`: Protege rutas por roles
- `@AuditTable('tableName')`: Habilita auditoría automática
- `@CurrentUser()`: Inyecta usuario actual en parámetro

### Ejemplo de uso

```typescript
@Post('usuarios')
@Roles('admin') // Solo admins
@AuditTable('usuarios') // Auditar cambios
async createUser(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

## 🗄️ Base de Datos

### Tablas principales

- **usuarios**: Usuarios del panel (admin/operator/auditor)
- **sesiones**: Sesiones activas con refresh tokens
- **sesiones_auditoria**: Log de auditoría (60 días de retención)
- **estudiantes**: Estudiantes inscritos
- **boletas_inscripciones**: Boletas procesadas
- **grupo_materia**: Mapeo de materias a grupos WhatsApp

## 📝 Scripts Útiles

```bash
# Crear usuario admin
cd ..
npm run create-admin

# Ver usuarios en DB
npm run check-users

# Probar autenticación
npm run test-auth
```

## 🏗️ Estructura del Proyecto

```
panel-backend/
├── src/
│   ├── common/
│   │   ├── decorators/     # @Roles, @AuditTable, @CurrentUser
│   │   ├── guards/         # RolesGuard, SessionGuard
│   │   └── interceptors/   # AuditInterceptor
│   ├── modules/
│   │   └── auth/           # Autenticación JWT
│   ├── prisma/             # PrismaService
│   └── main.ts             # Bootstrap
└── prisma/
    └── schema.prisma       # Schema generado desde DB
```
