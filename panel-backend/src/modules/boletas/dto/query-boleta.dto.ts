import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBoletaDto {
  @IsOptional()
  @IsString()
  search?: string; // Buscar por estudiante

  @IsOptional()
  @IsEnum(['pendiente', 'confirmado', 'procesando', 'completado', 'fallido', 'expirado'])
  estado?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_estudiante?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  id_semestre?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'fecha_subida';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
