import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommandDto, QueryCommandsDto, UpdateCommandDto, EstadoComando, TipoComando } from './dto';

@Injectable()
export class AdminCommandsService {
  private readonly logger = new Logger(AdminCommandsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Crear un nuevo comando para que el bot lo procese
   */
  async create(createCommandDto: CreateCommandDto, userId: number) {
    const { comando, parametros } = createCommandDto;

    // Validar parámetros según tipo de comando
    this.validateCommandParams(comando, parametros);

    try {
      const command = await this.prisma.admin_commands.create({
        data: {
          comando,
          parametros: parametros || {},
          estado: 'pendiente',
          creado_por: userId,
        },
        include: {
          usuarios: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      this.logger.log(`Command created: ${comando} by user ${userId}`);
      return command;
    } catch (error) {
      this.logger.error(`Failed to create command: ${error.message}`);
      throw new BadRequestException('Failed to create command');
    }
  }

  /**
   * Listar comandos con filtros
   */
  async findAll(query: QueryCommandsDto) {
    const { estado, limit = 50, offset = 0 } = query;

    const where = estado ? { estado } : {};

    const [commands, total] = await Promise.all([
      this.prisma.admin_commands.findMany({
        where,
        orderBy: { creado_en: 'desc' },
        take: limit,
        skip: offset,
        include: {
          usuarios: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.admin_commands.count({ where }),
    ]);

    return {
      data: commands,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Obtener un comando específico
   */
  async findOne(id: number) {
    const command = await this.prisma.admin_commands.findUnique({
      where: { id },
      include: {
        usuarios: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return command;
  }

  /**
   * Actualizar estado de comando (usado por el bot principalmente)
   */
  async update(id: number, updateCommandDto: UpdateCommandDto) {
    const command = await this.findOne(id);

    try {
      const updated = await this.prisma.admin_commands.update({
        where: { id },
        data: {
          estado: updateCommandDto.estado,
          resultado: updateCommandDto.resultado,
          ejecutado_en: updateCommandDto.estado === EstadoComando.COMPLETADO || updateCommandDto.estado === EstadoComando.FALLIDO
            ? new Date()
            : command.ejecutado_en,
        },
        include: {
          usuarios: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      this.logger.log(`Command ${id} updated to status: ${updateCommandDto.estado}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update command ${id}: ${error.message}`);
      throw new BadRequestException('Failed to update command');
    }
  }

  /**
   * Marcar comando como fallido (admin action para stale commands)
   */
  async markAsFailed(id: number, reason: string) {
    return this.update(id, {
      estado: EstadoComando.FALLIDO,
      resultado: { error: reason, marked_by_admin: true },
    });
  }

  /**
   * Reencolar comando (volver a pendiente)
   */
  async requeue(id: number) {
    const command = await this.findOne(id);

    if (command.estado === EstadoComando.PENDIENTE) {
      throw new BadRequestException('Command is already pending');
    }

    try {
      const updated = await this.prisma.admin_commands.update({
        where: { id },
        data: {
          estado: 'pendiente',
          bloqueado_por: null,
          bloqueado_en: null,
          ejecutado_en: null,
          resultado: Prisma.JsonNull,
        },
        include: {
          usuarios: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      this.logger.log(`Command ${id} requeued`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to requeue command ${id}: ${error.message}`);
      throw new BadRequestException('Failed to requeue command');
    }
  }

  /**
   * Obtener comandos "stale" (en procesando > 5 minutos)
   */
  async findStaleCommands() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    return this.prisma.admin_commands.findMany({
      where: {
        estado: 'procesando',
        bloqueado_en: {
          lt: fiveMinutesAgo,
        },
      },
      include: {
        usuarios: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { bloqueado_en: 'asc' },
    });
  }

  /**
   * Estadísticas de comandos
   */
  async getStats() {
    const [pendientes, procesando, completados, fallidos, total] = await Promise.all([
      this.prisma.admin_commands.count({ where: { estado: 'pendiente' } }),
      this.prisma.admin_commands.count({ where: { estado: 'procesando' } }),
      this.prisma.admin_commands.count({ where: { estado: 'completado' } }),
      this.prisma.admin_commands.count({ where: { estado: 'fallido' } }),
      this.prisma.admin_commands.count(),
    ]);

    return {
      pendientes,
      procesando,
      completados,
      fallidos,
      total,
    };
  }

  /**
   * Validar parámetros según tipo de comando
   */
  private validateCommandParams(comando: TipoComando, parametros?: Record<string, any>) {
    switch (comando) {
      case TipoComando.RETRY_ENROLLMENT:
        if (!parametros?.id_boleta_grupo) {
          throw new BadRequestException('retry_enrollment requires "id_boleta_grupo" parameter');
        }
        if (typeof parametros.id_boleta_grupo !== 'number') {
          throw new BadRequestException('"id_boleta_grupo" must be a number');
        }
        break;

      case TipoComando.REFRESH_GROUPS:
        // No requiere parámetros
        break;

      case TipoComando.RESTART_BOT:
        // No requiere parámetros
        break;

      default:
        throw new BadRequestException(`Unknown command type: ${comando}`);
    }
  }
}
