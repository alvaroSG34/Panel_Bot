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

  // ==================== MATERIAS ====================
  @Get('materias')
  getAllMaterias() {
    return this.gruposMateriasService.getAllMaterias();
  }

  @Post('materias')
  @Roles('admin')
  createMateria(@Body() data: { codigo_materia: string; nombre_materia: string }) {
    return this.gruposMateriasService.createMateria(data);
  }

  @Delete('materias/:id')
  @Roles('admin')
  deleteMateria(@Param('id', ParseIntPipe) id: number) {
    return this.gruposMateriasService.deleteMateria(id);
  }

  // ==================== GRUPOS ====================
  @Get('grupos')
  getAllGrupos() {
    return this.gruposMateriasService.getAllGrupos();
  }

  @Post('grupos')
  @Roles('admin')
  createGrupo(@Body() data: { codigo_grupo: string }) {
    return this.gruposMateriasService.createGrupo(data);
  }

  @Delete('grupos/:id')
  @Roles('admin')
  deleteGrupo(@Param('id', ParseIntPipe) id: number) {
    return this.gruposMateriasService.deleteGrupo(id);
  }

  // ==================== MAPEOS ====================
  @Get('mapeos')
  getAllMapeos() {
    return this.gruposMateriasService.getAllMapeos();
  }

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
