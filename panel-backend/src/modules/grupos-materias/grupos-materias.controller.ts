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
} from '@nestjs/common';
import { GruposMateriasService } from './grupos-materias.service';
import {
  QueryGrupoMateriaDto,
  CreateGrupoMateriaDto,
  UpdateGrupoMateriaDto,
} from './dto';
import { Roles, AuditTable } from '../../common/decorators';

@Controller('grupos-materias')
@AuditTable('grupo_materia')
export class GruposMateriasController {
  constructor(private gruposMateriasService: GruposMateriasService) {}

  @Get()
  findAll(@Query() query: QueryGrupoMateriaDto) {
    return this.gruposMateriasService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.gruposMateriasService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gruposMateriasService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() createDto: CreateGrupoMateriaDto) {
    return this.gruposMateriasService.create(createDto);
  }

  @Patch(':id')
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGrupoMateriaDto,
  ) {
    return this.gruposMateriasService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gruposMateriasService.remove(id);
  }
}
