import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FptAiService } from './fpt-ai.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [FptAiService],
  exports: [FptAiService],
})
export class FptAiModule {}
