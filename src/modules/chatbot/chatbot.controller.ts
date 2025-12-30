import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chatbot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { DestinationSearchDto } from './dto/chat-request.dto';

@ApiTags('chat')
@UseGuards(ThrottlerGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gửi tin nhắn tới chatbot du lịch (hỗ trợ ảnh)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Tin nhắn gửi tới chatbot',
          example: 'Tôi muốn tìm địa điểm tương tự như ảnh này',
        },
        lang: {
          type: 'string',
          enum: ['vi', 'en'],
          description: 'Ngôn ngữ phản hồi',
          example: 'vi',
        },
        sessionId: {
          type: 'string',
          description: 'ID phiên trò chuyện để lưu context',
        },
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Ảnh đính kèm (tối đa 3 ảnh)',
        },
      },
      required: ['message'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'images', maxCount: 3 }]),
  )
  @Throttle({ default: { limit: 1, ttl: 3 } })
  async handleChat(
    @Body() body: { message: string; lang?: string; sessionId?: string },
    @CurrentUser() user: RequestUser,
    @UploadedFiles() files?: { images?: Express.Multer.File[] },
  ) {
    const uploadedImages = files?.images;

    // Convert uploaded files to the format the service expects
    const images = uploadedImages?.length
      ? uploadedImages.map((file) => ({
          type: 'base64' as const,
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        }))
      : undefined;

    console.log(`[Chatbot] Message: "${body.message}", Received ${uploadedImages?.length ?? 0} images, userId: ${user.userId}`);

    return this.chatService.handleChat(body.message, body.lang, {
      userId: user.userId,
      sessionId: body.sessionId,
      images,
    });
  }
  @Post('classify-image')
  @ApiOperation({ summary: 'Test endpoint: Phân loại ảnh (Direct)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Ảnh cần phân loại',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async classifyImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh để phân loại');
    }
    return this.chatService.classifyImageOnly(file);
  }

  @Post('search-destinations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Smart Search: Tìm địa điểm chi tiết qua chat logic' })
  async searchDestinations(@Body() dto: DestinationSearchDto, @CurrentUser() user: RequestUser) {
    return this.chatService.handleDestinationSearchApi(dto.message, dto.lang, user.userId);
  }
}
