import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryBoletaDto, UpdateEstadoBoletaDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BoletasService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryBoletaDto) {
    const {
      search,
      estado,
      id_estudiante,
      id_semestre,
      page = 1,
      limit = 10,
      sortBy = 'fecha_subida',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Construir filtro
    const where: Prisma.boletas_inscripcionesWhereInput = {
      ...(estado && { estado: estado as any }),
      ...(id_estudiante && { id_estudiante }),
      ...(id_semestre && { id_semestre }),
      ...(search && {
        estudiantes: {
          OR: [
            { nombre_estudiante: { contains: search, mode: 'insensitive' } },
            { numero_registro: { contains: search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [total, boletas] = await Promise.all([
      this.prisma.boletas_inscripciones.count({ where }),
      this.prisma.boletas_inscripciones.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          estudiantes: {
            select: {
              id: true,
              numero_registro: true,
              nombre_estudiante: true,
            },
          },
          semestres: {
            select: {
              id: true,
              nombre: true,
            },
          },
          boleta_grupo: {
            include: {
              grupo_materia: {
                include: {
                  materias: true,
                  grupos: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: boletas,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const boleta = await this.prisma.boletas_inscripciones.findUnique({
      where: { id },
      include: {
        estudiantes: true,
        semestres: true,
        boleta_grupo: {
          include: {
            grupo_materia: {
              include: {
                materias: true,
                grupos: true,
                semestres: true,
              },
            },
          },
        },
      },
    });

    if (!boleta) {
      throw new NotFoundException(`Boleta con ID ${id} no encontrada`);
    }

    return boleta;
  }

  async updateEstado(id: number, updateEstadoDto: UpdateEstadoBoletaDto) {
    // Verificar que existe
    await this.findOne(id);

    // Actualizar estado
    return this.prisma.boletas_inscripciones.update({
      where: { id },
      data: {
        estado: updateEstadoDto.estado as any,
        ...(updateEstadoDto.estado === 'procesando' && { procesado_en: null }),
        ...(updateEstadoDto.estado === 'completado' && { procesado_en: new Date() }),
      },
      include: {
        estudiantes: true,
        semestres: true,
      },
    });
  }

  async getStats() {
    const estados = await this.prisma.boletas_inscripciones.groupBy({
      by: ['estado'],
      _count: true,
    });

    const total = await this.prisma.boletas_inscripciones.count();

    const porEstado = estados.reduce(
      (acc, item) => {
        acc[item.estado] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      porEstado,
    };
  }
}
