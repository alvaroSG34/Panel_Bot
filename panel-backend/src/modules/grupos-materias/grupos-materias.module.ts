import { Module } from '@nestjs/common';
import { GruposMateriasController } from './grupos-materias.controller';
import { GruposMateriasService } from './grupos-materias.service';

@Module({
  controllers: [GruposMateriasController],
  providers: [GruposMateriasService],
  exports: [GruposMateriasService],
})
export class GruposMateriasModule {}
