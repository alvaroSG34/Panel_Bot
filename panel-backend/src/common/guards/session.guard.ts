import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Verificar que el usuario tiene al menos una sesión activa
    const activeSessions = await this.prisma.sesiones.findFirst({
      where: {
        usuario_id: user.userId,
        revocado: false,
        expira_en: {
          gt: new Date(),
        },
      },
    });

    if (!activeSessions) {
      throw new UnauthorizedException('Todas las sesiones han sido revocadas');
    }

    return true;
  }
}
