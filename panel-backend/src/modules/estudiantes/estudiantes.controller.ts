import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { QueryEstudianteDto } from './dto';
import { AuditTable } from '../../common/decorators';

@Controller('estudiantes')
@AuditTable('estudiantes')
export class EstudiantesController {
  constructor(private estudiantesService: EstudiantesService) {}

  @Get()
  findAll(@Query() query: QueryEstudianteDto) {
    return this.estudiantesService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.estudiantesService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.estudiantesService.findOne(id);
  }
}
