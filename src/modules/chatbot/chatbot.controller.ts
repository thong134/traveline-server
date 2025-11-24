import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ChatService } from './chatbot.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@ApiTags('chat')
@UseGuards(ThrottlerGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Gửi tin nhắn tới chatbot du lịch' })
  @Throttle({ default: { limit: 1, ttl: 3 } })
  async handleChat(@Body() dto: ChatRequestDto) {
    return this.chatService.handleChat(dto.message, dto.lang, {
      userId: dto.userId,
      sessionId: dto.sessionId,
      images: dto.images,
    });
  }
}
