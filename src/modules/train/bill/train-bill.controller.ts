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
import { TrainBillsService } from './train-bill.service';
import { CreateTrainBillDto } from './dto/create-train-bill.dto';
import { UpdateTrainBillDto } from './dto/update-train-bill.dto';
import { TrainBillStatus } from './entities/train-bill.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { RequireVerification } from '../../auth/decorators/require-verification.decorator';

@ApiTags('train-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('train/bills')
export class TrainBillsController {
  constructor(private readonly service: TrainBillsService) {}

  @RequireVerification()
  @Post()
  @ApiOperation({ summary: 'Tạo hóa đơn tàu' })
  @ApiCreatedResponse({ description: 'Train bill created' })
  create(@Body() dto: CreateTrainBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hóa đơn tàu' })
  @ApiQuery({ name: 'routeId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TrainBillStatus })
  @ApiOkResponse({ description: 'Train bill list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('routeId') routeId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: TrainBillStatus,
  ) {
    return this.service.findAll(user.userId, {
      routeId: routeId ? Number(routeId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hóa đơn tàu' })
  @ApiOkResponse({ description: 'Train bill detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn tàu' })
  @ApiOkResponse({ description: 'Train bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hóa đơn tàu' })
  @ApiOkResponse({ description: 'Train bill removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
