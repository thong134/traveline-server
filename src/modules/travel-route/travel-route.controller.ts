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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { TravelRoutesService } from './travel-route.service';
import { CreateTravelRouteDto } from './dto/create-travel-route.dto';
import { UpdateTravelRouteDto } from './dto/update-travel-route.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { UpdateRouteStopTimeDto } from './dto/update-route-stop-time.dto';
import { UpdateRouteStopDetailsDto } from './dto/update-route-stop-details.dto';
import { ReorderRouteStopDto } from './dto/reorder-route-stop.dto';
import { UpdateRouteStopStatusDto } from './dto/update-route-stop-status.dto';
import { CheckInRouteStopDto } from './dto/checkin-route-stop.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { mediaMulterOptions } from '../../common/upload/image-upload.config';

type RouteStopMediaFiles = {
  images?: Express.Multer.File[];
  videos?: Express.Multer.File[];
};

function mapRouteStopMediaFiles(
  files: Record<string, Express.Multer.File[]> | undefined,
): RouteStopMediaFiles {
  return {
    images: files?.images,
    videos: files?.videos,
  };
}

@ApiTags('travel-routes')
@Controller('travel-routes')
export class TravelRoutesController {
  constructor(private readonly travelRoutesService: TravelRoutesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo hành trình du lịch kèm điểm dừng tùy chọn' })
  @ApiCreatedResponse({ description: 'Travel route created' })
  create(@Body() dto: CreateTravelRouteDto) {
    return this.travelRoutesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hành trình du lịch' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by route name' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by owner user id',
    type: Number,
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Filter by province',
  })
  @ApiOkResponse({ description: 'Travel route list' })
  findAll(
    @Query('q') q?: string,
    @Query('province') province?: string,
    @Query('userId') userId?: string,
  ) {
    return this.travelRoutesService.findAll({
      q,
      province,
      userId: userId ? Number(userId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hành trình du lịch' })
  @ApiOkResponse({ description: 'Travel route detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.travelRoutesService.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật hành trình du lịch' })
  @ApiOkResponse({ description: 'Travel route updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTravelRouteDto,
  ) {
    return this.travelRoutesService.update(id, dto);
  }

  @Patch(':routeId/stops/:stopId/time')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật thời gian bắt đầu/kết thúc của điểm dừng' })
  @ApiOkResponse({ description: 'Thời gian điểm dừng đã được cập nhật' })
  updateStopTime(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: UpdateRouteStopTimeDto,
  ) {
    return this.travelRoutesService.updateStopTime(routeId, stopId, dto);
  }

  @Patch(':routeId/stops/:stopId/details')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin chi tiết của điểm dừng' })
  @ApiOkResponse({ description: 'Điểm dừng đã được cập nhật' })
  updateStopDetails(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: UpdateRouteStopDetailsDto,
  ) {
    return this.travelRoutesService.updateStopDetails(routeId, stopId, dto);
  }

  @Patch(':routeId/stops/:stopId/reorder')
  @RequireAuth()
  @ApiOperation({ summary: 'Thay đổi thứ tự điểm dừng trong hành trình' })
  @ApiOkResponse({ description: 'Thứ tự điểm dừng đã được cập nhật' })
  reorderStop(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: ReorderRouteStopDto,
  ) {
    return this.travelRoutesService.reorderStop(routeId, stopId, dto);
  }

  @Patch(':routeId/stops/:stopId/status')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái của điểm dừng' })
  @ApiOkResponse({ description: 'Trạng thái điểm dừng đã được cập nhật' })
  updateStopStatus(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: UpdateRouteStopStatusDto,
  ) {
    return this.travelRoutesService.updateStopStatus(routeId, stopId, dto.status);
  }

  @Post(':routeId/stops/:stopId/media')
  @RequireAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Ảnh điểm dừng (tối đa 10)',
        },
        videos: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Video điểm dừng (tối đa 5)',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
      ],
      mediaMulterOptions,
    ),
  )
  @ApiOperation({ summary: 'Tải ảnh/video cho điểm dừng' })
  @ApiOkResponse({ description: 'Media đã được lưu' })
  uploadStopMedia(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @UploadedFiles() files?: Record<string, Express.Multer.File[]>,
  ) {
    return this.travelRoutesService.uploadStopMedia(
      routeId,
      stopId,
      mapRouteStopMediaFiles(files),
    );
  }

  @Post(':routeId/stops/:stopId/check-in')
  @RequireAuth()
  @ApiOperation({
    summary:
      'Xác nhận người dùng đã đến điểm dừng dựa trên vị trí hiện tại và chuyển trạng thái sang completed',
  })
  @ApiOkResponse({ description: 'Kết quả check-in điểm dừng' })
  checkInStop(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: CheckInRouteStopDto,
  ) {
    return this.travelRoutesService.checkInStop(
      routeId,
      stopId,
      dto.latitude,
      dto.longitude,
      dto.toleranceMeters,
    );
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa hành trình du lịch' })
  @ApiOkResponse({ description: 'Travel route removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.travelRoutesService.remove(id);
  }
}
