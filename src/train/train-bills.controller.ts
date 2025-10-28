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
import { TrainBillsService } from './train-bills.service';
import { CreateTrainBillDto } from './dto/create-train-bill.dto';
import { UpdateTrainBillDto } from './dto/update-train-bill.dto';
import { TrainBillStatus } from './train-bill.entity';

@ApiTags('train-bills')
@Controller('train/bills')
export class TrainBillsController {
  constructor(private readonly service: TrainBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create train bill' })
  @ApiCreatedResponse({ description: 'Train bill created' })
  create(@Body() dto: CreateTrainBillDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List train bills' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'routeId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TrainBillStatus })
  @ApiOkResponse({ description: 'Train bill list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('routeId') routeId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: TrainBillStatus,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      routeId: routeId ? Number(routeId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get train bill detail' })
  @ApiOkResponse({ description: 'Train bill detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update train bill' })
  @ApiOkResponse({ description: 'Train bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainBillDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove train bill' })
  @ApiOkResponse({ description: 'Train bill removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
