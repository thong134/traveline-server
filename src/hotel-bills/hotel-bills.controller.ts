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
import { HotelBillsService } from './hotel-bills.service';
import { CreateHotelBillDto } from './dto/create-hotel-bill.dto';
import { UpdateHotelBillDto } from './dto/update-hotel-bill.dto';
import { HotelBillStatus } from './hotel-bill.entity';

@ApiTags('hotel-bills')
@Controller('hotel-bills')
export class HotelBillsController {
  constructor(private readonly hotelBillsService: HotelBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create hotel booking bill' })
  @ApiCreatedResponse({ description: 'Hotel bill created' })
  create(@Body() dto: CreateHotelBillDto) {
    return this.hotelBillsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List hotel bills' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: HotelBillStatus })
  @ApiQuery({ name: 'voucherId', required: false, type: Number })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiOkResponse({ description: 'Hotel bill list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: HotelBillStatus,
    @Query('voucherId') voucherId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.hotelBillsService.findAll({
      userId: userId ? Number(userId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
      voucherId: voucherId ? Number(voucherId) : undefined,
      fromDate,
      toDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get hotel bill detail' })
  @ApiOkResponse({ description: 'Hotel bill detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.hotelBillsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hotel bill' })
  @ApiOkResponse({ description: 'Hotel bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHotelBillDto,
  ) {
    return this.hotelBillsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hotel bill' })
  @ApiOkResponse({ description: 'Hotel bill removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.hotelBillsService.remove(id);
  }
}
