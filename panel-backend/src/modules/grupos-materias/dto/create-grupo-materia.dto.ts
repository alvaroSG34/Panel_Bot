import { IsInt, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateGrupoMateriaDto {
  @IsInt()
  id_semestre: number;

  @IsInt()
  id_materia: number;

  @IsInt()
  id_grupo: number;

  @IsString()
  @MaxLength(255)
  jid_grupo_whatsapp: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  modalidad?: string;

  @IsOptional()
  @IsString()
  horario?: string;
}
