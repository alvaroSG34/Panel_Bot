import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_TABLE_KEY } from '../decorators/audit-table.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Solo auditar operaciones de modificación
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const tableName = this.reflector.get<string>(
      AUDIT_TABLE_KEY,
      context.getHandler(),
    );

    const cambiosAntes = request.body;

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const controllerName = context.getClass().name;
          const handlerName = context.getHandler().name;
          const accion = `${controllerName}.${handlerName}`;

          await this.prisma.sesiones_auditoria.create({
            data: {
              usuario_id: user?.userId || null,
              accion,
              tabla_afectada: tableName || null,
              registro_id: result?.id || null,
              cambios_antes: cambiosAntes || null,
              cambios_despues: result || null,
              ip_address: request.ip,
            },
          });
        } catch (error) {
          console.error('Error al crear registro de auditoría:', error);
        }
      }),
    );
  }
}
