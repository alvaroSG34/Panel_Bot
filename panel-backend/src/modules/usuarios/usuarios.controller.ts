import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import {
  QueryUsuarioDto,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  ResetPasswordDto,
} from './dto';
import { Roles, CurrentUser, AuditTable } from '../../common/decorators';
import { Request } from 'express';

@Controller('usuarios')
@Roles('admin') // Solo administradores
@AuditTable('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  findAll(@Query() query: QueryUsuarioDto) {
    return this.usuariosService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.usuariosService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  create(@Body() createDto: CreateUsuarioDto) {
    return this.usuariosService.create(createDto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, updateDto);
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usuariosService.resetPassword(id, resetPasswordDto);
  }

  @Post(':id/force-logout')
  forceLogout(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.forceLogout(id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usuariosService.remove(id, user.userId);
  }
}
