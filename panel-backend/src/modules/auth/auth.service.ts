import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto, RefreshTokenDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const { username, password } = loginDto;

    // Buscar usuario por username
    const user = await this.prisma.usuarios.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar tokens
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generar refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Calcular fecha de expiración (7 días)
    const expiresIn = new Date();
    expiresIn.setDate(expiresIn.getDate() + 7);

    // Guardar sesión en base de datos
    await this.prisma.sesiones.create({
      data: {
        usuario_id: user.id,
        refresh_token_hash: refreshTokenHash,
        ip_address: ipAddress,
        user_agent: userAgent,
        expira_en: expiresIn,
        revocado: false,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto, ipAddress: string, userAgent: string) {
    const { refreshToken } = refreshTokenDto;

    // Buscar todas las sesiones activas
    const sessions = await this.prisma.sesiones.findMany({
      where: {
        revocado: false,
        expira_en: {
          gt: new Date(),
        },
      },
      include: {
        usuarios: true,
      },
    });

    // Buscar sesión que coincida con el refresh token
    let matchedSession = null;
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
      if (isMatch) {
        matchedSession = session;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = matchedSession.usuarios;

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Generar nuevo access token
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
    };
  }

  async logout(userId: number, refreshToken: string) {
    // Buscar y revocar la sesión correspondiente
    const sessions = await this.prisma.sesiones.findMany({
      where: {
        usuario_id: userId,
        revocado: false,
      },
    });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
      if (isMatch) {
        await this.prisma.sesiones.update({
          where: { id: session.id },
          data: { revocado: true },
        });
        break;
      }
    }

    return { message: 'Sesión cerrada exitosamente' };
  }
}
