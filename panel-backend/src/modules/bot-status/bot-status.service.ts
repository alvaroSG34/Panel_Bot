import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateHeartbeatDto } from './dto';

@Injectable()
export class BotStatusService {
  private readonly logger = new Logger(BotStatusService.name);
  private readonly HEARTBEAT_TIMEOUT = 2 * 60 * 1000; // 2 minutos

  constructor(private prisma: PrismaService) {}

  /**
   * Actualizar heartbeat del bot (llamado por el bot cada minuto)
   */
  async updateHeartbeat(updateHeartbeatDto: UpdateHeartbeatDto) {
    const {
      estado_whatsapp,
      version_bot,
      pid,
      hostname,
      grupos_cache,
      queueStats,
    } = updateHeartbeatDto;

    try {
      // Upsert: actualizar si existe (id=1), crear si no existe
      const heartbeat = await this.prisma.bot_heartbeat.upsert({
        where: { id: 1 },
        update: {
          ultima_conexion: new Date(),
          estado_whatsapp: estado_whatsapp || null,
          version_bot: version_bot || null,
          pid: pid || null,
          hostname: hostname || null,
          grupos_cache: grupos_cache ? (grupos_cache as Prisma.InputJsonValue) : Prisma.JsonNull,
          queue_stats: queueStats ? (queueStats as Prisma.InputJsonValue) : Prisma.JsonNull,
          actualizado_en: new Date(),
        },
        create: {
          id: 1,
          ultima_conexion: new Date(),
          estado_whatsapp: estado_whatsapp || null,
          version_bot: version_bot || null,
          pid: pid || null,
          hostname: hostname || null,
          grupos_cache: grupos_cache ? (grupos_cache as Prisma.InputJsonValue) : Prisma.JsonNull,
          queue_stats: queueStats ? (queueStats as Prisma.InputJsonValue) : Prisma.JsonNull,
          actualizado_en: new Date(),
        },
      });

      this.logger.log(`Heartbeat updated from bot (PID: ${pid}, Hostname: ${hostname})`);
      return heartbeat;
    } catch (error) {
      this.logger.error(`Failed to update heartbeat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener estado actual del bot
   */
  async getStatus() {
    const heartbeat = await this.prisma.bot_heartbeat.findUnique({
      where: { id: 1 },
    });

    if (!heartbeat || !heartbeat.ultima_conexion) {
      return {
        online: false,
        message: 'Bot nunca se ha conectado',
        lastSeen: null,
        status: null,
      };
    }

    const now = new Date();
    const lastSeen = new Date(heartbeat.ultima_conexion);
    const timeSinceLastHeartbeat = now.getTime() - lastSeen.getTime();
    const isOnline = timeSinceLastHeartbeat < this.HEARTBEAT_TIMEOUT;

    return {
      online: isOnline,
      message: isOnline 
        ? 'Bot activo y corriendo'
        : `Bot inactivo (última conexión hace ${Math.floor(timeSinceLastHeartbeat / 1000)}s)`,
      lastSeen: heartbeat.ultima_conexion,
      status: heartbeat.estado_whatsapp,
      version: heartbeat.version_bot,
      pid: heartbeat.pid,
      hostname: heartbeat.hostname,
      timeSinceLastHeartbeat: Math.floor(timeSinceLastHeartbeat / 1000),
      totalGroups: heartbeat.grupos_cache 
        ? Object.keys(heartbeat.grupos_cache as Record<string, any>).length 
        : 0,
      queueStats: (heartbeat as any).queue_stats || null,
    };
  }

  /**
   * Obtener información detallada del heartbeat
   */
  async getHeartbeatDetails() {
    const heartbeat = await this.prisma.bot_heartbeat.findUnique({
      where: { id: 1 },
    });

    if (!heartbeat) {
      return null;
    }

    return heartbeat;
  }

  /**
   * Obtener cache de grupos de WhatsApp
   */
  async getGroupsCache() {
    const heartbeat = await this.prisma.bot_heartbeat.findUnique({
      where: { id: 1 },
      select: {
        grupos_cache: true,
        actualizado_en: true,
      },
    });

    if (!heartbeat || !heartbeat.grupos_cache) {
      return {
        groups: [],
        lastUpdated: null,
        total: 0,
      };
    }

    const groups = heartbeat.grupos_cache as Record<string, any>;

    return {
      groups: Object.entries(groups).map(([jid, info]) => ({
        jid,
        ...info,
      })),
      lastUpdated: heartbeat.actualizado_en,
      total: Object.keys(groups).length,
    };
  }

  /**
   * Detectar múltiples instancias del bot corriendo
   * (Basado en cambios de PID o hostname en un corto período)
   */
  async detectMultipleInstances() {
    const heartbeat = await this.prisma.bot_heartbeat.findUnique({
      where: { id: 1 },
    });

    if (!heartbeat) {
      return {
        multipleInstances: false,
        message: 'No hay instancias del bot corriendo',
      };
    }

    // En este caso simple, solo podemos detectar si el PID o hostname cambian
    // Para una detección más robusta, necesitaríamos un historial de heartbeats
    
    const now = new Date();
    const lastSeen = new Date(heartbeat.ultima_conexion || now);
    const timeSinceLastHeartbeat = now.getTime() - lastSeen.getTime();
    const isRecent = timeSinceLastHeartbeat < this.HEARTBEAT_TIMEOUT;

    if (!isRecent) {
      return {
        multipleInstances: false,
        message: 'No hay instancias activas',
        lastInstance: {
          pid: heartbeat.pid,
          hostname: heartbeat.hostname,
          lastSeen: heartbeat.ultima_conexion,
        },
      };
    }

    return {
      multipleInstances: false, // Con single-row table, no podemos detectar múltiples instancias simultáneas
      message: 'Una instancia activa',
      currentInstance: {
        pid: heartbeat.pid,
        hostname: heartbeat.hostname,
        lastSeen: heartbeat.ultima_conexion,
        status: heartbeat.estado_whatsapp,
      },
      warning: 'La tabla actual (single-row) no permite detectar múltiples instancias simultáneas. Considerar agregar un historial de heartbeats para esta funcionalidad.',
    };
  }

  /**
   * Limpiar heartbeat (usado para testing o reset)
   */
  async clearHeartbeat() {
    try {
      await this.prisma.bot_heartbeat.deleteMany({});
      this.logger.log('Heartbeat cleared');
      return { message: 'Heartbeat cleared successfully' };
    } catch (error) {
      this.logger.error(`Failed to clear heartbeat: ${error.message}`);
      throw error;
    }
  }
}
