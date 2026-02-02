import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryEstudianteDto } from './dto';

@Injectable()
export class EstudiantesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryEstudianteDto) {
    const { search, page = 1, limit = 10, sortBy = 'creado_en', sortOrder = 'desc' } = query;

    const skip = (page - 1) * limit;

    // Construir filtro de búsqueda
    const where = search
      ? {
          OR: [
            { numero_registro: { contains: search, mode: 'insensitive' as const } },
            { nombre_estudiante: { contains: search, mode: 'insensitive' as const } },
            { id_whatsapp: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Ejecutar query con paginación
    const [total, estudiantes] = await Promise.all([
      this.prisma.estudiantes.count({ where }),
      this.prisma.estudiantes.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          boletas_inscripciones: {
            select: {
              id: true,
              estado: true,
              fecha_subida: true,
            },
            orderBy: { fecha_subida: 'desc' },
            take: 5, // Últimas 5 boletas
          },
        },
      }),
    ]);

    return {
      data: estudiantes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const estudiante = await this.prisma.estudiantes.findUnique({
      where: { id },
      include: {
        boletas_inscripciones: {
          include: {
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
          orderBy: { fecha_subida: 'desc' },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException(`Estudiante con ID ${id} no encontrado`);
    }

    return estudiante;
  }

  async getStats() {
    const [total, activos, conBoletas] = await Promise.all([
      this.prisma.estudiantes.count(),
      this.prisma.estudiantes.count({
        where: {
          total_materias_registradas: { gt: 0 },
        },
      }),
      this.prisma.estudiantes.count({
        where: {
          boletas_inscripciones: {
            some: {},
          },
        },
      }),
    ]);

    return {
      total,
      activos,
      conBoletas,
      sinBoletas: total - conBoletas,
    };
  }
}
