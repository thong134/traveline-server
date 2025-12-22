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
import { FlightBillsService } from './flight-bill.service';
import { CreateFlightBillDto } from './dto/create-flight-bill.dto';
import { UpdateFlightBillDto } from './dto/update-flight-bill.dto';
import { FlightBillStatus } from './entities/flight-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { RequireVerification } from '../../auth/decorators/require-verification.decorator';

@ApiTags('flight-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('flight/bills')
export class FlightBillsController {
  constructor(private readonly service: FlightBillsService) {}

  @RequireVerification()
  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn chuyến bay' })
  @ApiCreatedResponse({ description: 'Flight bill created' })
  create(@Body() dto: CreateFlightBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn chuyến bay' })
  @ApiQuery({ name: 'flightId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: FlightBillStatus })
  @ApiOkResponse({ description: 'Flight bill list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('flightId') flightId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: FlightBillStatus,
  ) {
    return this.service.findAll(user.userId, {
      flightId: flightId ? Number(flightId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn chuyến bay' })
  @ApiOkResponse({ description: 'Flight bill detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn chuyến bay' })
  @ApiOkResponse({ description: 'Flight bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFlightBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hóa đơn chuyến bay' })
  @ApiOkResponse({ description: 'Flight bill removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
