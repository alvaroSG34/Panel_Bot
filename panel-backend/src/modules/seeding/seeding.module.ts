import { Module } from '@nestjs/common';
import { SeedingController } from './seeding.controller';
import { SeedingService } from './seeding.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeedingController],
  providers: [SeedingService],
})
export class SeedingModule {}
