import { IsEnum, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export enum TipoComando {
  RETRY_ENROLLMENT = 'retry_enrollment',
  REFRESH_GROUPS = 'refresh_groups',
  RESTART_BOT = 'restart_bot',
}

export class CreateCommandDto {
  @IsEnum(TipoComando)
  @IsNotEmpty()
  comando: TipoComando;

  @IsObject()
  @IsOptional()
  parametros?: Record<string, any>;
}
