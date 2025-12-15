import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { mediaMulterOptions } from '../../common/upload/image-upload.config';
import type { Express } from 'express';

type FeedbackMediaFiles = {
  photos?: Express.Multer.File[];
  videos?: Express.Multer.File[];
};

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @RequireAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        star: { type: 'integer', minimum: 1, maximum: 5 },
        userId: { type: 'integer' },
        userUid: { type: 'string' },
        destinationId: { type: 'integer' },
        travelRouteId: { type: 'integer' },
        licensePlate: { type: 'string' },
        cooperationId: { type: 'integer' },
        comment: { type: 'string' },
        photos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Ảnh feedback (tối đa 10)',
        },
        videos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Video feedback (tối đa 5)',
        },
      },
      required: ['star'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photos', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
      ],
      mediaMulterOptions,
    ),
  )
  @ApiOperation({ summary: 'Gửi phản hồi' })
  @ApiCreatedResponse({ description: 'Feedback created' })
  create(
    @Body() dto: CreateFeedbackDto,
    @UploadedFiles() files?: FeedbackMediaFiles,
  ) {
    return this.feedbackService.create(dto, files);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách phản hồi' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user id',
    type: Number,
  })
  @ApiQuery({
    name: 'destinationId',
    required: false,
    description: 'Filter by destination id',
    type: Number,
  })
  @ApiQuery({
    name: 'travelRouteId',
    required: false,
    description: 'Filter by travel route id',
    type: Number,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of feedback',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Offset results',
    type: Number,
  })
  @ApiOkResponse({ description: 'Feedback list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('destinationId') destinationId?: string,
    @Query('travelRouteId') travelRouteId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.feedbackService.findAll({
      userId: userId ? Number(userId) : undefined,
      destinationId: destinationId ? Number(destinationId) : undefined,
      travelRouteId: travelRouteId ? Number(travelRouteId) : undefined,
      status: status || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phản hồi' })
  @ApiOkResponse({ description: 'Feedback detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật phản hồi' })
  @ApiOkResponse({ description: 'Feedback updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa phản hồi' })
  @ApiOkResponse({ description: 'Feedback removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.remove(id);
  }

  @Post('moderation/test')
  @ApiOperation({ summary: 'Kiểm tra AI moderation cho comment feedback' })
  @ApiCreatedResponse({ description: 'Kết quả moderation' })
  testModeration(@Body('comment') comment: string) {
    return this.feedbackService.moderateComment(comment);
  }
}
