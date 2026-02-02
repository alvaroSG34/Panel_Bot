# AdminCommands Module - Resumen de Implementación

## ✅ Archivos Creados

### DTOs
- `dto/create-command.dto.ts` - Validación para crear comandos
- `dto/query-commands.dto.ts` - Parámetros de búsqueda/filtrado
- `dto/update-command.dto.ts` - Actualización de estado/resultado
- `dto/index.ts` - Barrel export

### Core Module
- `admin-commands.service.ts` - Lógica de negocio (300+ líneas)
- `admin-commands.controller.ts` - Endpoints REST
- `admin-commands.module.ts` - Configuración del módulo

### Testing
- `test-admin-commands.js` - Script de prueba completo

## 📋 Funcionalidades Implementadas

### 1. CRUD de Comandos
- ✅ **Crear comando** (`POST /admin-commands`)
  - Validación de tipo de comando (retry_enrollment, refresh_groups, restart_bot)
  - Validación de parámetros según tipo
  - Asociación con usuario creador

- ✅ **Listar comandos** (`GET /admin-commands`)
  - Filtro por estado (pendiente, procesando, completado, fallido)
  - Paginación con limit/offset
  - Ordenamiento por fecha de creación

- ✅ **Obtener comando** (`GET /admin-commands/:id`)
  - Incluye relación con usuario creador

- ✅ **Actualizar comando** (`PUT /admin-commands/:id`)
  - Cambio de estado
  - Guardado de resultado
  - Timestamp de ejecución automático

### 2. Operaciones Admin
- ✅ **Reencolar comando** (`PUT /admin-commands/:id/requeue`)
  - Volver a estado pendiente
  - Resetear campos de bloqueo y ejecución
  - Validación: no reencolar si ya está pendiente

- ✅ **Marcar como fallido** (`PUT /admin-commands/:id/mark-failed`)
  - Marca manual por admin
  - Guarda razón en resultado

### 3. Monitoreo
- ✅ **Estadísticas** (`GET /admin-commands/monitoring/stats`)
  - Contador por estado
  - Total general

- ✅ **Comandos stale** (`GET /admin-commands/monitoring/stale`)
  - Detecta comandos en "procesando" > 5 minutos
  - Para identificar procesos colgados

### 4. Validaciones de Negocio

#### retry_enrollment
```typescript
// Requiere: id_boleta_grupo (number)
{
  "comando": "retry_enrollment",
  "parametros": {
    "id_boleta_grupo": 123
  }
}
```

#### refresh_groups
```typescript
// No requiere parámetros
{
  "comando": "refresh_groups",
  "parametros": {}
}
```

#### restart_bot
```typescript
// No requiere parámetros
{
  "comando": "restart_bot",
  "parametros": {}
}
```

## 🔐 Control de Acceso (RBAC)

| Endpoint | Admin | Operator | Auditor |
|----------|-------|----------|---------|
| POST /admin-commands | ✅ | ❌ | ❌ |
| GET /admin-commands | ✅ | ✅ | ✅ |
| GET /admin-commands/:id | ✅ | ✅ | ✅ |
| PUT /admin-commands/:id | ✅ | ❌ | ❌ |
| PUT /:id/requeue | ✅ | ❌ | ❌ |
| PUT /:id/mark-failed | ✅ | ❌ | ❌ |
| GET /monitoring/stats | ✅ | ✅ | ✅ |
| GET /monitoring/stale | ✅ | ✅ | ❌ |

## 🧪 Cómo Probar

### 1. Iniciar Backend
```powershell
cd d:\Panel_Bot\panel-backend
npm run start:dev
```

### 2. Ejecutar Tests
```powershell
cd d:\Panel_Bot
node test-admin-commands.js
```

### Casos de Prueba Cubiertos
- ✅ Login con usuario admin
- ✅ Crear comando refresh_groups
- ✅ Crear comando retry_enrollment con parámetros
- ✅ Crear comando restart_bot
- ✅ Listar todos los comandos
- ✅ Listar solo comandos pendientes
- ✅ Obtener comando específico
- ✅ Actualizar a procesando
- ✅ Actualizar a completado con resultado
- ✅ Actualizar a fallido con error
- ✅ Reencolar comando fallido
- ✅ Marcar como fallido por admin
- ✅ Ver estadísticas
- ✅ Ver comandos stale

## 📦 Integración con App Module

```typescript
// src/app.module.ts
import { AdminCommandsModule } from './modules/admin-commands/admin-commands.module';

@Module({
  imports: [
    // ... otros módulos
    AdminCommandsModule,
  ],
})
```

## 🔄 Próximos Pasos (Integración con Bot)

### En el Bot (d:\BotWhatsapp\src\index.js)

1. **Polling de comandos** (cada 10 segundos):
```javascript
async function pollAdminCommands() {
  const response = await fetch(`${PANEL_API}/admin-commands?estado=pendiente&limit=10`);
  const { data: commands } = await response.json();
  
  for (const cmd of commands) {
    await processCommand(cmd);
  }
}

setInterval(pollAdminCommands, 10000);
```

2. **Procesar comandos**:
```javascript
async function processCommand(cmd) {
  // Marcar como procesando
  await fetch(`${PANEL_API}/admin-commands/${cmd.id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'procesando' })
  });
  
  try {
    switch(cmd.comando) {
      case 'retry_enrollment':
        await retryEnrollment(cmd.parametros.id_boleta_grupo);
        break;
      case 'refresh_groups':
        await refreshGroupsCache();
        break;
      case 'restart_bot':
        await gracefulRestart();
        break;
    }
    
    // Marcar como completado
    await fetch(`${PANEL_API}/admin-commands/${cmd.id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        estado: 'completado',
        resultado: { success: true, timestamp: new Date() }
      })
    });
  } catch (error) {
    // Marcar como fallido
    await fetch(`${PANEL_API}/admin-commands/${cmd.id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        estado: 'fallido',
        resultado: { error: error.message }
      })
    });
  }
}
```

3. **Crash recovery al iniciar**:
```javascript
async function reclaimStaleCommands() {
  const response = await fetch(`${PANEL_API}/admin-commands/monitoring/stale`);
  const staleCommands = await response.json();
  
  for (const cmd of staleCommands) {
    await fetch(`${PANEL_API}/admin-commands/${cmd.id}/requeue`, {
      method: 'PUT'
    });
  }
}

// Ejecutar al inicio
await reclaimStaleCommands();
```

## 📝 Notas Técnicas

- **Optimistic Locking**: No implementado en esta tabla (no es necesario)
- **Audit Logging**: Habilitado via `@AuditTable('admin_commands')`
- **Rate Limiting**: Protegido por ThrottlerGuard global
- **Validación**: Class-validator en todos los DTOs
- **Logging**: Winston logger con contexto estructurado

## 🎯 Estado Final

✅ **Módulo 100% funcional y listo para usar**

Próximo módulo recomendado:
- **BotStatusModule** - Para heartbeat y detección multi-instancia
