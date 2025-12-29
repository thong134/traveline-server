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
import { FeedbackReactionType } from './entities/feedback-reaction.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { mediaMulterOptions } from '../../common/upload/image-upload.config';
import type { Express } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CreateReplyDto } from './dto/create-reply.dto';

type FeedbackMediaFiles = {
  photos?: Express.Multer.File[];
  videos?: Express.Multer.File[];
};

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('check-content')
  @RequireAuth()
  @ApiOperation({ summary: 'Kiểm tra nội dung feedback với AI (để cảnh báo user)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['content'],
      properties: { content: { type: 'string' } },
    },
  })
  checkContent(
    @Body('content') content: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feedbackService.checkContent(user.userId, content);
  }

  @Post()
  @RequireAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        star: { type: 'integer', minimum: 1, maximum: 5 },
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
  @ApiCreatedResponse({
    description: 'Feedback created',
    schema: {
      type: 'object',
      properties: {
        feedback: { $ref: '#/components/schemas/Feedback' },
      },
    },
  })
  create(
    @Body() dto: CreateFeedbackDto,
    @UploadedFiles() files: FeedbackMediaFiles | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feedbackService.create(user.userId, dto, files);
  }

  @Get('me')
  @RequireAuth()
  @ApiOperation({ summary: 'Lấy danh sách feedback của tôi' })
  getMyFeedback(@CurrentUser() user: RequestUser) {
    return this.feedbackService.findAll({ userId: user.userId });
  }

  @Get('by-object')
  @ApiOperation({ summary: 'Danh sách feedback theo đối tượng dịch vụ' })
  @ApiQuery({ name: 'destinationId', required: false, type: Number })
  @ApiQuery({ name: 'travelRouteId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'licensePlate', required: false, type: String })
  findByObject(
    @Query('destinationId') destinationId?: string,
    @Query('travelRouteId') travelRouteId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('licensePlate') licensePlate?: string,
  ) {
    return this.feedbackService.findByObject({
      destinationId: destinationId ? Number(destinationId) : undefined,
      travelRouteId: travelRouteId ? Number(travelRouteId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      licensePlate: licensePlate || undefined,
    });
  }

  @Post(':id/replies')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm trả lời cho một feedback' })
  @ApiCreatedResponse({ description: 'Reply created' })
  createReply(
    @Param('id', ParseIntPipe) feedbackId: number,
    @Body() dto: CreateReplyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feedbackService.createReply(feedbackId, user.userId, dto);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Danh sách trả lời của một feedback' })
  listReplies(@Param('id', ParseIntPipe) feedbackId: number) {
    return this.feedbackService.listReplies(feedbackId);
  }

  @Post(':id/reactions/:type')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm reaction (like/love) cho feedback' })
  @ApiOkResponse({ description: 'Reaction added' })
  addReaction(
    @Param('id', ParseIntPipe) feedbackId: number,
    @Param('type') type: FeedbackReactionType,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feedbackService.addReaction(feedbackId, user.userId, type);
  }

  @Delete(':id/reactions/:type')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa reaction (like/love) khỏi feedback' })
  @ApiOkResponse({ description: 'Reaction removed' })
  removeReaction(
    @Param('id', ParseIntPipe) feedbackId: number,
    @Param('type') type: FeedbackReactionType,
    @CurrentUser() user: RequestUser,
  ) {
    return this.feedbackService.removeReaction(feedbackId, user.userId, type);
  }

  @Get('object-author')
  @ApiOperation({
    summary: 'Lấy thông tin người viết feedback cho một dịch vụ/đối tượng',
  })
  @ApiQuery({ name: 'destinationId', required: false, type: Number })
  @ApiQuery({ name: 'travelRouteId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'licensePlate', required: false, type: String })
  getAuthor(
    @Query('destinationId') destinationId?: string,
    @Query('travelRouteId') travelRouteId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('licensePlate') licensePlate?: string,
  ) {
    return this.feedbackService.getAuthorForService({
      destinationId: destinationId ? Number(destinationId) : undefined,
      travelRouteId: travelRouteId ? Number(travelRouteId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      licensePlate: licensePlate || undefined,
    });
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
    name: 'cooperationId',
    required: false,
    description: 'Filter by cooperation id',
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
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.feedbackService.findAll({
      userId: userId ? Number(userId) : undefined,
      destinationId: destinationId ? Number(destinationId) : undefined,
      travelRouteId: travelRouteId ? Number(travelRouteId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
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


  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa phản hồi' })
  @ApiOkResponse({ description: 'Feedback removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.remove(id);
  }


}
