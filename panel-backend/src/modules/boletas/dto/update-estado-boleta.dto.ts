import { IsEnum } from 'class-validator';

export class UpdateEstadoBoletaDto {
  @IsEnum(['pendiente', 'confirmado', 'procesando', 'completado', 'fallido', 'expirado'])
  estado: string;
}
