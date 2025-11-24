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
import { TrainRoutesService } from './train.service';
import { CreateTrainRouteDto } from './dto/create-train-route.dto';
import { UpdateTrainRouteDto } from './dto/update-train-route.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('train-routes')
@Controller('train/routes')
export class TrainRoutesController {
  constructor(private readonly service: TrainRoutesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo tuyến tàu' })
  @ApiCreatedResponse({ description: 'Train route created' })
  create(@Body() dto: CreateTrainRouteDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tuyến tàu' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'departureStation', required: false, type: String })
  @ApiQuery({ name: 'arrivalStation', required: false, type: String })
  @ApiOkResponse({ description: 'Train route list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('departureStation') departureStation?: string,
    @Query('arrivalStation') arrivalStation?: string,
  ) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      departureStation: departureStation ?? undefined,
      arrivalStation: arrivalStation ?? undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tuyến tàu' })
  @ApiOkResponse({ description: 'Train route detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật tuyến tàu' })
  @ApiOkResponse({ description: 'Train route updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainRouteDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa tuyến tàu' })
  @ApiOkResponse({ description: 'Train route removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
