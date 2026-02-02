import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EstudiantesModule } from './modules/estudiantes/estudiantes.module';
import { BoletasModule } from './modules/boletas/boletas.module';
import { GruposMateriasModule } from './modules/grupos-materias/grupos-materias.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AdminCommandsModule } from './modules/admin-commands/admin-commands.module';
import { BotStatusModule } from './modules/bot-status/bot-status.module';
import { LogsModule } from './modules/logs/logs.module';
import { SeedingModule } from './modules/seeding/seeding.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard, SessionGuard } from './common/guards';
import { AuditInterceptor } from './common/interceptors';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 10, // 10 requests por minuto (default)
      },
    ]),
    PrismaModule,
    AuthModule,
    EstudiantesModule,
    BoletasModule,
    GruposMateriasModule,
    UsuariosModule,
    AdminCommandsModule,
    BotStatusModule,
    LogsModule,
    SeedingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SessionGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
