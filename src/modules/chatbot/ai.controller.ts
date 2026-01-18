import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chatbot.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly chatService: ChatService) {}

  @Post('vision/classify')
  @ApiOperation({ summary: 'Demo: Nhận dạng địa danh qua mô hình PlaceClassifier (Flask Service)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Hình ảnh cần nhận dạng',
        },
      },
      required: ['image'],
    },
  })
  @UseInterceptors(FileInterceptor('image'))
  async classify(@UploadedFile() file: Express.Multer.File) {
    return this.chatService.classifyImage(file);
  }
}
