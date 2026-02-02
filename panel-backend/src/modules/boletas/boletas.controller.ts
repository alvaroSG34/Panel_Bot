import { Controller, Get, Param, Query, Patch, Body, ParseIntPipe } from '@nestjs/common';
import { BoletasService } from './boletas.service';
import { QueryBoletaDto, UpdateEstadoBoletaDto } from './dto';
import { Roles, AuditTable } from '../../common/decorators';

@Controller('boletas')
@AuditTable('boletas_inscripciones')
export class BoletasController {
  constructor(private boletasService: BoletasService) {}

  @Get()
  findAll(@Query() query: QueryBoletaDto) {
    return this.boletasService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.boletasService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.boletasService.findOne(id);
  }

  @Patch(':id/estado')
  @Roles('admin', 'operator')
  updateEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoDto: UpdateEstadoBoletaDto,
  ) {
    return this.boletasService.updateEstado(id, updateEstadoDto);
  }
}
