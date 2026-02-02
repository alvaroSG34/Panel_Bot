import { IsString, IsInt, IsOptional, IsObject } from 'class-validator';

export class UpdateHeartbeatDto {
  @IsString()
  @IsOptional()
  estado_whatsapp?: string;

  @IsString()
  @IsOptional()
  version_bot?: string;

  @IsInt()
  @IsOptional()
  pid?: number;

  @IsString()
  @IsOptional()
  hostname?: string;

  @IsObject()
  @IsOptional()
  grupos_cache?: Record<string, any>;
}
