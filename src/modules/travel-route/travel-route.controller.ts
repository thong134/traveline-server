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
import { RouteStopDto } from './dto/route-stop.dto';
import { DeleteStopMediaDto } from './dto/delete-stop-media.dto';

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
  @ApiOperation({ summary: 'Tạo lộ trình du lịch' })
  @ApiCreatedResponse({ description: 'Travel route created' })
  create(@Body() dto: CreateTravelRouteDto, @CurrentUser() user: RequestUser) {
    return this.travelRoutesService.create({
      ...dto,
      userId: user.userId,
    });
  }

  @Post(':id/stops')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm mới một hoặc nhiều điểm dừng vào lộ trình' })
  @ApiBody({ type: [RouteStopDto] })
  @ApiCreatedResponse({ description: 'Stops added to route' })
  addStops(
    @Param('id', ParseIntPipe) id: number,
    @Body() stops: RouteStopDto | RouteStopDto[],
  ) {
    const dtos = Array.isArray(stops) ? stops : [stops];
    return this.travelRoutesService.addStops(id, dtos);
  }

  @Post(':id/clone')
  @RequireAuth()
  @ApiOperation({
    summary: 'Sao chép một lộ trình thành bản riêng của user hiện tại',
  })
  @ApiOkResponse({ description: 'Travel route cloned' })
  cloneRoute(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.travelRoutesService.cloneRoute(id);
  }

  @Post(':id/use')
  @RequireAuth()
  @ApiOperation({
    summary: 'Sử dụng bản clone gán cho user và tạo bản clone mới',
  })
  @ApiOkResponse({ description: 'Travel route used' })
  useClone(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.travelRoutesService.useClone(id, user.userId);
  }

  @Get('drafts')
  @ApiOperation({ summary: 'Danh sách lộ trình của các người dùng khác (draft) theo tỉnh' })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Lọc theo tỉnh/thành phố',
  })
  @ApiOkResponse({ description: 'Draft travel route list' })
  findDrafts(@Query('province') province?: string) {
    return this.travelRoutesService.findDrafts(province);
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

  @Delete(':routeId/stops/:stopId/media')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa ảnh/video khỏi điểm dừng' })
  @ApiBody({ type: DeleteStopMediaDto })
  @ApiOkResponse({ description: 'Media đã được xóa' })
  deleteStopMedia(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
    @Body() dto: DeleteStopMediaDto,
  ) {
    return this.travelRoutesService.deleteStopMedia(routeId, stopId, {
      images: dto.images,
      videos: dto.videos,
    });
  }

  @Post(':routeId/stops/:stopId/check-in')
  @RequireAuth()
  @ApiOperation({
    summary:
      'Xác nhận người dùng đã đến điểm dừng dựa trên vị trí hiện tại',
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

  @Get('me')
  @RequireAuth()
  @ApiOperation({ summary: 'Danh sách hành trình du lịch của chính mình' })
  @ApiOkResponse({ description: 'Travel route list of current user' })
  findMine(@CurrentUser() user: RequestUser) {
    return this.travelRoutesService.findByUser(user.userId);
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
    return this.travelRoutesService.update(id, dto);
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


  
  @Delete(':routeId/stops/:stopId')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa một điểm dừng khỏi lộ trình' })
  @ApiOkResponse({ description: 'Route stop removed' })
  removeStop(
    @Param('routeId', ParseIntPipe) routeId: number,
    @Param('stopId', ParseIntPipe) stopId: number,
  ) {
    return this.travelRoutesService.removeStop(routeId, stopId);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa hành trình du lịch' })
  @ApiOkResponse({ description: 'Travel route removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.travelRoutesService.remove(id);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hành trình du lịch (Admin)' })
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
}
