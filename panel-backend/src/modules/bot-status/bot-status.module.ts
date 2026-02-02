import { Module } from '@nestjs/common';
import { BotStatusController } from './bot-status.controller';
import { BotStatusService } from './bot-status.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BotStatusController],
  providers: [BotStatusService],
  exports: [BotStatusService],
})
export class BotStatusModule {}
