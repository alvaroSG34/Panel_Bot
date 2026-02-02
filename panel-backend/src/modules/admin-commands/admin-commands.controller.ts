import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminCommandsService } from './admin-commands.service';
import { CreateCommandDto, QueryCommandsDto, UpdateCommandDto } from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditTable } from '../../common/decorators/audit-table.decorator';

@Controller('admin-commands')
@AuditTable('admin_commands')
export class AdminCommandsController {
  constructor(private readonly adminCommandsService: AdminCommandsService) {}

  /**
   * Crear comando (solo admin)
   */
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCommandDto: CreateCommandDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.adminCommandsService.create(createCommandDto, userId);
  }

  /**
   * Listar comandos
   * - Admin: ve todos
   * - Operator: ve todos (read-only implícito por guard)
   * - Auditor: ve todos (read-only implícito por guard)
   */
  @Get()
  @Roles('admin', 'operator', 'auditor')
  async findAll(@Query() query: QueryCommandsDto) {
    return this.adminCommandsService.findAll(query);
  }

  /**
   * Obtener comando específico
   */
  @Get(':id')
  @Roles('admin', 'operator', 'auditor')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminCommandsService.findOne(id);
  }

  /**
   * Actualizar comando (principalmente usado por el bot, pero permitido para admin)
   */
  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommandDto: UpdateCommandDto,
  ) {
    return this.adminCommandsService.update(id, updateCommandDto);
  }

  /**
   * Marcar comando como fallido (admin action)
   */
  @Put(':id/mark-failed')
  @Roles('admin')
  async markAsFailed(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
  ) {
    return this.adminCommandsService.markAsFailed(id, reason || 'Marked as failed by admin');
  }

  /**
   * Reencolar comando (volver a pendiente)
   */
  @Put(':id/requeue')
  @Roles('admin')
  async requeue(@Param('id', ParseIntPipe) id: number) {
    return this.adminCommandsService.requeue(id);
  }

  /**
   * Obtener comandos "stale" (en procesando > 5 minutos)
   */
  @Get('monitoring/stale')
  @Roles('admin', 'operator')
  async findStaleCommands() {
    return this.adminCommandsService.findStaleCommands();
  }

  /**
   * Estadísticas de comandos
   */
  @Get('monitoring/stats')
  @Roles('admin', 'operator', 'auditor')
  async getStats() {
    return this.adminCommandsService.getStats();
  }
}
