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
import { DeliveryVehiclesService } from './delivery-vehicles.service';
import { CreateDeliveryVehicleDto } from './dto/create-delivery-vehicle.dto';
import { UpdateDeliveryVehicleDto } from './dto/update-delivery-vehicle.dto';

@ApiTags('delivery-vehicles')
@Controller('delivery/vehicles')
export class DeliveryVehiclesController {
  constructor(private readonly service: DeliveryVehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Create delivery vehicle type' })
  @ApiCreatedResponse({ description: 'Delivery vehicle created' })
  create(@Body() dto: CreateDeliveryVehicleDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List delivery vehicles' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiOkResponse({ description: 'Delivery vehicle list' })
  findAll(@Query('cooperationId') cooperationId?: string) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery vehicle detail' })
  @ApiOkResponse({ description: 'Delivery vehicle detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery vehicle' })
  @ApiOkResponse({ description: 'Delivery vehicle updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryVehicleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove delivery vehicle' })
  @ApiOkResponse({ description: 'Delivery vehicle removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
