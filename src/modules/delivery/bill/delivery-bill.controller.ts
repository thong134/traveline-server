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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DeliveryBillsService } from './delivery-bill.service';
import { CreateDeliveryBillDto } from './dto/create-delivery-bill.dto';
import { UpdateDeliveryBillDto } from './dto/update-delivery-bill.dto';
import { DeliveryBillStatus } from './entities/delivery-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('delivery-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('delivery/bills')
export class DeliveryBillsController {
  constructor(private readonly service: DeliveryBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create delivery bill' })
  @ApiCreatedResponse({ description: 'Delivery bill created' })
  create(@Body() dto: CreateDeliveryBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List delivery bills' })
  @ApiQuery({ name: 'vehicleId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DeliveryBillStatus })
  @ApiOkResponse({ description: 'Delivery bill list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('vehicleId') vehicleId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: DeliveryBillStatus,
  ) {
    return this.service.findAll(user.userId, {
      vehicleId: vehicleId ? Number(vehicleId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery bill detail' })
  @ApiOkResponse({ description: 'Delivery bill detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery bill' })
  @ApiOkResponse({ description: 'Delivery bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDeliveryBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove delivery bill' })
  @ApiOkResponse({ description: 'Delivery bill removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
