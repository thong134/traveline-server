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
import { DeliveryBillsService } from './delivery-bills.service';
import { CreateDeliveryBillDto } from './dto/create-delivery-bill.dto';
import { UpdateDeliveryBillDto } from './dto/update-delivery-bill.dto';
import { DeliveryBillStatus } from './delivery-bill.entity';

@ApiTags('delivery-bills')
@Controller('delivery/bills')
export class DeliveryBillsController {
  constructor(private readonly service: DeliveryBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create delivery bill' })
  @ApiCreatedResponse({ description: 'Delivery bill created' })
  create(@Body() dto: CreateDeliveryBillDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List delivery bills' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'vehicleId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryBillStatus })
  @ApiOkResponse({ description: 'Delivery bill list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: DeliveryBillStatus,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery bill detail' })
  @ApiOkResponse({ description: 'Delivery bill detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery bill' })
  @ApiOkResponse({ description: 'Delivery bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryBillDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove delivery bill' })
  @ApiOkResponse({ description: 'Delivery bill removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
