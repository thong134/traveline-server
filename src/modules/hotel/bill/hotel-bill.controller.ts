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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { HotelBillsService } from './hotel-bill.service';
import { CreateHotelBillDto } from './dto/create-hotel-bill.dto';
import { UpdateHotelBillDto } from './dto/update-hotel-bill.dto';
import { HotelBillStatus } from './entities/hotel-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('hotel-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel-bills')
export class HotelBillsController {
  constructor(private readonly hotelBillsService: HotelBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create hotel booking bill' })
  @ApiCreatedResponse({ description: 'Hotel bill created' })
  create(
    @Body() dto: CreateHotelBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List hotel bills' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: HotelBillStatus })
  @ApiQuery({ name: 'voucherId', required: false, type: Number })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiOkResponse({ description: 'Hotel bill list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: HotelBillStatus,
    @Query('voucherId') voucherId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.hotelBillsService.findAll(user.userId, {
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
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update hotel bill' })
  @ApiOkResponse({ description: 'Hotel bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHotelBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete hotel bill' })
  @ApiOkResponse({ description: 'Hotel bill removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.hotelBillsService.remove(id, user.userId);
  }
}
