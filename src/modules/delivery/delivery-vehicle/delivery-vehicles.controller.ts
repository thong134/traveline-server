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
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('delivery-vehicles')
@Controller('delivery/vehicles')
export class DeliveryVehiclesController {
  constructor(private readonly service: DeliveryVehiclesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo phương tiện giao hàng' })
  @ApiCreatedResponse({ description: 'Delivery vehicle created' })
  create(@Body() dto: CreateDeliveryVehicleDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách phương tiện giao hàng' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiOkResponse({ description: 'Delivery vehicle list' })
  findAll(@Query('cooperationId') cooperationId?: string) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phương tiện giao hàng' })
  @ApiOkResponse({ description: 'Delivery vehicle detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật phương tiện giao hàng' })
  @ApiOkResponse({ description: 'Delivery vehicle updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryVehicleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa phương tiện giao hàng' })
  @ApiOkResponse({ description: 'Delivery vehicle removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
