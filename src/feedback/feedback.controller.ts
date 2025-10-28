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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit feedback' })
  @ApiCreatedResponse({ description: 'Feedback created' })
  create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List feedback' })
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
    name: 'destinationExternalId',
    required: false,
    description: 'Filter by destination external id',
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
    @Query('destinationExternalId') destinationExternalId?: string,
    @Query('travelRouteId') travelRouteId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.feedbackService.findAll({
      userId: userId ? Number(userId) : undefined,
      destinationId: destinationId ? Number(destinationId) : undefined,
      destinationExternalId: destinationExternalId || undefined,
      travelRouteId: travelRouteId ? Number(travelRouteId) : undefined,
      status: status || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback detail' })
  @ApiOkResponse({ description: 'Feedback detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback' })
  @ApiOkResponse({ description: 'Feedback updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete feedback' })
  @ApiOkResponse({ description: 'Feedback removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.remove(id);
  }
}
