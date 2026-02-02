import { Controller, Post, Body, UseGuards, Req, Ip, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 intentos cada 15 minutos
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(loginDto, ip, userAgent || 'unknown');
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 intentos por minuto
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refresh(refreshTokenDto, ip, userAgent || 'unknown');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: any,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.logout(user.userId, refreshToken);
  }
}
