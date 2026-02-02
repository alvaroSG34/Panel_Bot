import { Module } from '@nestjs/common';
import { AdminCommandsController } from './admin-commands.controller';
import { AdminCommandsService } from './admin-commands.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCommandsController],
  providers: [AdminCommandsService],
  exports: [AdminCommandsService],
})
export class AdminCommandsModule {}
