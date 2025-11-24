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
import { BusBillsService } from './bus-bills.service';
import { CreateBusBillDto } from './dto/create-bus-bill.dto';
import { UpdateBusBillDto } from './dto/update-bus-bill.dto';
import { BusBillStatus } from './entities/bus-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('bus-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bus/bills')
export class BusBillsController {
  constructor(private readonly service: BusBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn xe buýt' })
  @ApiCreatedResponse({ description: 'Bus bill created' })
  create(@Body() dto: CreateBusBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn xe buýt' })
  @ApiQuery({ name: 'busTypeId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: BusBillStatus })
  @ApiOkResponse({ description: 'Bus bill list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('busTypeId') busTypeId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: BusBillStatus,
  ) {
    return this.service.findAll(user.userId, {
      busTypeId: busTypeId ? Number(busTypeId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn xe buýt' })
  @ApiOkResponse({ description: 'Bus bill detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn xe buýt' })
  @ApiOkResponse({ description: 'Bus bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBusBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hóa đơn xe buýt' })
  @ApiOkResponse({ description: 'Bus bill removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
