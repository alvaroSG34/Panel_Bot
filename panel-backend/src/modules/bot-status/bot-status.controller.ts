import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BotStatusService } from './bot-status.service';
import { UpdateHeartbeatDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('bot')
export class BotStatusController {
  constructor(private readonly botStatusService: BotStatusService) {}

  /**
   * Actualizar heartbeat (llamado por el bot - público)
   * IMPORTANTE: En producción, proteger con API key o autenticación específica del bot
   */
  @Public()
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async updateHeartbeat(@Body() updateHeartbeatDto: UpdateHeartbeatDto) {
    return this.botStatusService.updateHeartbeat(updateHeartbeatDto);
  }

  /**
   * Obtener estado actual del bot (todos los roles)
   */
  @Get('status')
  @Roles('admin', 'operator', 'auditor')
  async getStatus() {
    return this.botStatusService.getStatus();
  }

  /**
   * Obtener información detallada del heartbeat (todos los roles)
   */
  @Get('heartbeat')
  @Roles('admin', 'operator', 'auditor')
  async getHeartbeatDetails() {
    return this.botStatusService.getHeartbeatDetails();
  }

  /**
   * Obtener cache de grupos de WhatsApp (todos los roles)
   */
  @Get('groups-cache')
  @Roles('admin', 'operator', 'auditor')
  async getGroupsCache() {
    return this.botStatusService.getGroupsCache();
  }

  /**
   * Detectar múltiples instancias (admin y operator)
   */
  @Get('instances')
  @Roles('admin', 'operator')
  async detectMultipleInstances() {
    return this.botStatusService.detectMultipleInstances();
  }

  /**
   * Limpiar heartbeat (solo admin, útil para testing)
   */
  @Delete('heartbeat')
  @Roles('admin')
  async clearHeartbeat() {
    return this.botStatusService.clearHeartbeat();
  }
}
