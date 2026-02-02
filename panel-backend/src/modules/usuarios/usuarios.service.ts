import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QueryUsuarioDto,
  CreateUsuarioDto,
  UpdateUsuarioDto,
  ResetPasswordDto,
} from './dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryUsuarioDto) {
    const {
      search,
      role,
      activo,
      page = 1,
      limit = 10,
      sortBy = 'creado_en',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.usuariosWhereInput = {
      ...(role && { role: role as any }),
      ...(activo !== undefined && { activo: activo === 'true' }),
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, usuarios] = await Promise.all([
      this.prisma.usuarios.count({ where }),
      this.prisma.usuarios.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          activo: true,
          creado_en: true,
          version: true,
          // NO incluir password_hash
        },
      }),
    ]);

    return {
      data: usuarios,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        activo: true,
        creado_en: true,
        version: true,
        sesiones: {
          select: {
            id: true,
            ip_address: true,
            user_agent: true,
            creado_en: true,
            expira_en: true,
          },
          where: {
            expira_en: { gte: new Date() },
          },
          orderBy: { creado_en: 'desc' },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return usuario;
  }

  async create(createDto: CreateUsuarioDto) {
    // Verificar username único
    const existing = await this.prisma.usuarios.findUnique({
      where: { username: createDto.username },
    });

    if (existing) {
      throw new ConflictException(`El username "${createDto.username}" ya está en uso`);
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(createDto.password, saltRounds);

    // Crear usuario
    const usuario = await this.prisma.usuarios.create({
      data: {
        username: createDto.username,
        password_hash,
        role: createDto.role as any,
        email: createDto.email,
        activo: true,
        version: 0,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        activo: true,
        creado_en: true,
        version: true,
      },
    });

    return usuario;
  }

  async update(id: number, updateDto: UpdateUsuarioDto) {
    const { version, ...updateData } = updateDto;

    // Verificar que existe
    const existing = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Optimistic locking
    if (existing.version !== version) {
      const current = await this.findOne(id);
      throw new ConflictException({
        message: 'El usuario fue modificado por otro administrador',
        currentData: current,
        attemptedVersion: version,
        currentVersion: existing.version,
      });
    }

    // Si se cambia username, verificar que no exista
    if (updateData.username && updateData.username !== existing.username) {
      const duplicate = await this.prisma.usuarios.findUnique({
        where: { username: updateData.username },
      });

      if (duplicate) {
        throw new ConflictException(`El username "${updateData.username}" ya está en uso`);
      }
    }

    // Actualizar
    return this.prisma.usuarios.update({
      where: { id },
      data: {
        ...updateData,
        role: updateData.role as any,
        version: { increment: 1 },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        activo: true,
        creado_en: true,
        version: true,
      },
    });
  }

  async resetPassword(id: number, resetPasswordDto: ResetPasswordDto) {
    // Verificar que existe
    const existing = await this.prisma.usuarios.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Hash nuevo password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(resetPasswordDto.newPassword, saltRounds);

    // Actualizar password
    await this.prisma.usuarios.update({
      where: { id },
      data: { password_hash },
    });

    // Revocar todas las sesiones activas
    await this.prisma.sesiones.deleteMany({
      where: { usuario_id: id },
    });

    return { message: 'Password actualizado y sesiones revocadas' };
  }

  async forceLogout(id: number) {
    // Verificar que existe
    await this.findOne(id);

    // Eliminar todas las sesiones activas
    const result = await this.prisma.sesiones.deleteMany({
      where: { usuario_id: id },
    });

    return {
      message: `${result.count} sesión(es) cerrada(s) forzadamente`,
      count: result.count,
    };
  }

  async remove(id: number, currentUserId: number) {
    // No permitir auto-eliminación
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }

    // Verificar que existe
    await this.findOne(id);

    // Verificar si tiene registros de auditoría
    const auditCount = await this.prisma.sesiones_auditoria.count({
      where: { usuario_id: id },
    });

    if (auditCount > 0) {
      // Soft delete: solo desactivar
      return this.prisma.usuarios.update({
        where: { id },
        data: { activo: false },
        select: {
          id: true,
          username: true,
          activo: true,
        },
      });
    }

    // Hard delete si no tiene auditoría
    return this.prisma.usuarios.delete({
      where: { id },
    });
  }

  async getStats() {
    const [total, activos, porRol] = await Promise.all([
      this.prisma.usuarios.count(),
      this.prisma.usuarios.count({ where: { activo: true } }),
      this.prisma.usuarios.groupBy({
        by: ['role'],
        _count: true,
      }),
    ]);

    return {
      total,
      activos,
      inactivos: total - activos,
      porRol: porRol.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}
