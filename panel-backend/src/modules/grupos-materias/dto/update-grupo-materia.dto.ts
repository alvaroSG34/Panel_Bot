import { IsInt, IsString, IsOptional, MaxLength, Min } from 'class-validator';

export class UpdateGrupoMateriaDto {
  @IsOptional()
  @IsInt()
  id_semestre?: number;

  @IsOptional()
  @IsInt()
  id_materia?: number;

  @IsOptional()
  @IsInt()
  id_grupo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  jid_grupo_whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  modalidad?: string;

  @IsOptional()
  @IsString()
  horario?: string;

  // Optimistic locking
  @IsInt()
  @Min(0)
  version: number;
}
