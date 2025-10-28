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
import { BusBillsService } from './bus-bills.service';
import { CreateBusBillDto } from './dto/create-bus-bill.dto';
import { UpdateBusBillDto } from './dto/update-bus-bill.dto';
import { BusBillStatus } from './bus-bill.entity';

@ApiTags('bus-bills')
@Controller('bus/bills')
export class BusBillsController {
  constructor(private readonly service: BusBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create bus bill' })
  @ApiCreatedResponse({ description: 'Bus bill created' })
  create(@Body() dto: CreateBusBillDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bus bills' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'busTypeId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: BusBillStatus })
  @ApiOkResponse({ description: 'Bus bill list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('busTypeId') busTypeId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: BusBillStatus,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      busTypeId: busTypeId ? Number(busTypeId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bus bill detail' })
  @ApiOkResponse({ description: 'Bus bill detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bus bill' })
  @ApiOkResponse({ description: 'Bus bill updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusBillDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove bus bill' })
  @ApiOkResponse({ description: 'Bus bill removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
