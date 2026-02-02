import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryGrupoMateriaDto,
  CreateGrupoMateriaDto,
  UpdateGrupoMateriaDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GruposMateriasService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryGrupoMateriaDto) {
    const {
      search,
      id_semestre,
      id_materia,
      page = 1,
      limit = 10,
      sortBy = 'id',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.grupo_materiaWhereInput = {
      ...(id_semestre && { id_semestre }),
      ...(id_materia && { id_materia }),
      ...(search && {
        OR: [
          { materias: { codigo_materia: { contains: search, mode: 'insensitive' } } },
          { materias: { nombre: { contains: search, mode: 'insensitive' } } },
          { grupos: { codigo_grupo: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, ofertas] = await Promise.all([
      this.prisma.grupo_materia.count({ where }),
      this.prisma.grupo_materia.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          materias: true,
          grupos: true,
          semestres: true,
        },
      }),
    ]);

    return {
      data: ofertas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const oferta = await this.prisma.grupo_materia.findUnique({
      where: { id },
      include: {
        materias: true,
        grupos: true,
        semestres: true,
        boleta_grupo: {
          include: {
            boletas_inscripciones: {
              include: {
                estudiantes: {
                  select: {
                    id: true,
                    numero_registro: true,
                    nombre_estudiante: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!oferta) {
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    }

    return oferta;
  }

  async create(createDto: CreateGrupoMateriaDto) {
    // Verificar que existan las referencias
    const [semestre, materia, grupo] = await Promise.all([
      this.prisma.semestres.findUnique({ where: { id: createDto.id_semestre } }),
      this.prisma.materias.findUnique({ where: { id: createDto.id_materia } }),
      this.prisma.grupos.findUnique({ where: { id: createDto.id_grupo } }),
    ]);

    if (!semestre) {
      throw new BadRequestException(`Semestre con ID ${createDto.id_semestre} no existe`);
    }
    if (!materia) {
      throw new BadRequestException(`Materia con ID ${createDto.id_materia} no existe`);
    }
    if (!grupo) {
      throw new BadRequestException(`Grupo con ID ${createDto.id_grupo} no existe`);
    }

    // Verificar duplicados (mismo semestre + materia + grupo)
    const existing = await this.prisma.grupo_materia.findFirst({
      where: {
        id_semestre: createDto.id_semestre,
        id_materia: createDto.id_materia,
        id_grupo: createDto.id_grupo,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una oferta para ${materia.codigo_materia} - ${grupo.codigo_grupo} en este semestre`,
      );
    }

    return this.prisma.grupo_materia.create({
      data: {
        id_semestre: createDto.id_semestre,
        id_materia: createDto.id_materia,
        id_grupo: createDto.id_grupo,
        jid_grupo_whatsapp: createDto.jid_grupo_whatsapp,
        modalidad: createDto.modalidad,
        horario: createDto.horario,
        version: 0,
      },
      include: {
        materias: true,
        grupos: true,
        semestres: true,
      },
    });
  }

  async update(id: number, updateDto: UpdateGrupoMateriaDto) {
    const { version, ...updateData } = updateDto;

    // Verificar que existe
    const existing = await this.prisma.grupo_materia.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Oferta con ID ${id} no encontrada`);
    }

    // Optimistic locking: verificar versión
    if (existing.version !== version) {
      // Devolver datos actuales para mostrar diff en UI
      const current = await this.findOne(id);
      throw new ConflictException({
        message: 'El registro fue modificado por otro usuario',
        currentData: current,
        attemptedVersion: version,
        currentVersion: existing.version,
      });
    }

    // Actualizar con incremento de versión
    return this.prisma.grupo_materia.update({
      where: { id },
      data: {
        ...updateData,
        version: { increment: 1 },
      },
      include: {
        materias: true,
        grupos: true,
        semestres: true,
      },
    });
  }

  async remove(id: number) {
    // Verificar que existe
    await this.findOne(id);

    // Verificar si tiene inscripciones asociadas
    const hasEnrollments = await this.prisma.boleta_grupo.count({
      where: { id_grupo_materia: id },
    });

    if (hasEnrollments > 0) {
      throw new ConflictException(
        `No se puede eliminar: existen ${hasEnrollments} inscripciones asociadas`,
      );
    }

    return this.prisma.grupo_materia.delete({
      where: { id },
    });
  }

  async getStats() {
    const [total, porSemestre, porModalidad] = await Promise.all([
      this.prisma.grupo_materia.count(),
      this.prisma.grupo_materia.groupBy({
        by: ['id_semestre'],
        _count: true,
      }),
      this.prisma.grupo_materia.groupBy({
        by: ['modalidad'],
        _count: true,
      }),
    ]);

    return {
      total,
      porSemestre,
      porModalidad: porModalidad.reduce(
        (acc, item) => {
          acc[item.modalidad || 'sin_especificar'] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  // ==================== MATERIAS ====================
  async getAllMaterias() {
    return this.prisma.materias.findMany({
      orderBy: { codigo_materia: 'asc' },
    });
  }

  async createMateria(data: { codigo_materia: string; nombre_materia: string }) {
    const existing = await this.prisma.materias.findUnique({
      where: { codigo_materia: data.codigo_materia },
    });

    if (existing) {
      throw new ConflictException(`Materia ${data.codigo_materia} ya existe`);
    }

    return this.prisma.materias.create({
      data: {
        codigo_materia: data.codigo_materia,
        nombre: data.nombre_materia,
      },
    });
  }

  async deleteMateria(id: number) {
    const materia = await this.prisma.materias.findUnique({ where: { id } });
    if (!materia) {
      throw new NotFoundException(`Materia con ID ${id} no encontrada`);
    }

    const hasMapeos = await this.prisma.grupo_materia.count({
      where: { id_materia: id },
    });

    if (hasMapeos > 0) {
      throw new ConflictException(
        `No se puede eliminar: existen ${hasMapeos} grupos asociados`,
      );
    }

    return this.prisma.materias.delete({ where: { id } });
  }

  // ==================== GRUPOS ====================
  async getAllGrupos() {
    return this.prisma.grupos.findMany({
      orderBy: { codigo_grupo: 'asc' },
    });
  }

  async createGrupo(data: { codigo_grupo: string }) {
    const existing = await this.prisma.grupos.findUnique({
      where: { codigo_grupo: data.codigo_grupo },
    });

    if (existing) {
      throw new ConflictException(`Grupo ${data.codigo_grupo} ya existe`);
    }

    return this.prisma.grupos.create({
      data: {
        codigo_grupo: data.codigo_grupo,
      },
    });
  }

  async deleteGrupo(id: number) {
    const grupo = await this.prisma.grupos.findUnique({ where: { id } });
    if (!grupo) {
      throw new NotFoundException(`Grupo con ID ${id} no encontrada`);
    }

    const hasMapeos = await this.prisma.grupo_materia.count({
      where: { id_grupo: id },
    });

    if (hasMapeos > 0) {
      throw new ConflictException(
        `No se puede eliminar: existen ${hasMapeos} materias asociadas`,
      );
    }

    return this.prisma.grupos.delete({ where: { id } });
  }

  // ==================== MAPEOS ====================
  async getAllMapeos() {
    return this.prisma.grupo_materia.findMany({
      include: {
        materias: true,
        grupos: true,
        semestres: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }
}
