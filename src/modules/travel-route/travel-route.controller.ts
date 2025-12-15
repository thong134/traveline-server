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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { UpdateSharedDto } from './dto/update-shared.dto';

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
  create(@Body() dto: CreateTravelRouteDto, @CurrentUser() user: RequestUser) {
    return this.travelRoutesService.create({
      ...dto,
      userId: dto.userId ?? user.userId,
    });
  }

  @Get('me')
  @RequireAuth()
  @ApiOperation({ summary: 'Danh sách hành trình du lịch của chính mình' })
  @ApiOkResponse({ description: 'Travel route list of current user' })
  findMine(@CurrentUser() user: RequestUser) {
    return this.travelRoutesService.findByUser(user.userId);
  }

  @Post(':id/clone')
  @RequireAuth()
  @ApiOperation({
    summary: 'Sao chép một lộ trình đã share thành bản riêng của user hiện tại',
  })
  @ApiOkResponse({ description: 'Travel route cloned' })
  cloneRoute(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.travelRoutesService.cloneRoute(id, user.userId);
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
  @ApiQuery({
    name: 'shared',
    required: false,
    description: 'Chỉ lấy các lộ trình đã được share (true/false)',
    type: Boolean,
  })
  @ApiOkResponse({ description: 'Travel route list' })
  findAll(
    @Query('q') q?: string,
    @Query('province') province?: string,
    @Query('userId') userId?: string,
    @Query('shared') shared?: string,
  ) {
    return this.travelRoutesService.findAll({
      q,
      province,
      userId: userId ? Number(userId) : undefined,
      shared:
        typeof shared === 'string'
          ? shared.toLowerCase() === 'true'
          : undefined,
    });
  }

  @Get('public')
  @ApiOperation({
    summary:
      'Danh sách lộ trình du lịch công khai theo tỉnh (không kèm thông tin cá nhân)',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Lọc theo tỉnh/thành phố',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Tìm theo tên lộ trình',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Giới hạn số bản ghi',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Bỏ qua bao nhiêu bản ghi',
    type: Number,
  })
  @ApiOkResponse({ description: 'Public travel route list' })
  findSharedRoutes(
    @Query('province') province?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.travelRoutesService.findSharedRoutes({
      province,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('me/dates')
  @RequireAuth()
  @ApiOperation({
    summary:
      'Lấy danh sách startDate/endDate của các lộ trình của user hiện tại (phục vụ nhắc nhở)',
  })
  @ApiOkResponse({ description: 'User travel route dates' })
  findMyRouteDates(@CurrentUser() user: RequestUser) {
    return this.travelRoutesService.findRouteDatesByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hành trình du lịch' })
  @ApiOkResponse({ description: 'Travel route detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.travelRoutesService.findOne(id);
  }

  @Get(':routeId/stops/:stopId')
  @RequireAuth()
  @ApiOperation({
    summary: 'Chi tiết một điểm dừng trong lộ trình (kèm địa điểm)',
  })
  @ApiOkResponse({ description: 'Route stop detail' })
  getStopDetail(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
  ) {
    return this.travelRoutesService.getStopDetail(routeId, stopId);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật hành trình du lịch' })
  @ApiOkResponse({ description: 'Travel route updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTravelRouteDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.travelRoutesService.update(id, {
      ...dto,
      userId: dto.userId ?? user.userId,
    });
  }

  @Patch(':id/share')
  @RequireAuth()
  @ApiOperation({ summary: 'Bật/tắt chia sẻ lộ trình' })
  @ApiOkResponse({ description: 'Travel route share flag updated' })
  updateShare(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSharedDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.travelRoutesService.updateShared(id, dto.shared, user.userId);
  }

  @Patch(':routeId/stops/:stopId/time')
  @RequireAuth()
  @ApiOperation({
    summary: 'Cập nhật thời gian bắt đầu/kết thúc của điểm dừng',
  })
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
    return this.travelRoutesService.updateStopStatus(
      routeId,
      stopId,
      dto.status,
    );
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
