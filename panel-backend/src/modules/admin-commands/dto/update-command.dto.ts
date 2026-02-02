import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { EstadoComando } from './query-commands.dto';

export class UpdateCommandDto {
  @IsEnum(EstadoComando)
  @IsOptional()
  estado?: EstadoComando;

  @IsObject()
  @IsOptional()
  resultado?: Record<string, any>;
}
