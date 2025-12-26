import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { RentalVehiclesService } from './rental-vehicle.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from './enums/rental-vehicle.enum';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user-role.enum';
import { RejectRentalVehicleDto } from './dto/manage-rental-vehicle.dto';
import type { Express } from 'express';
import { imageMulterOptions } from '../../common/upload/image-upload.config';
import { SearchRentalVehicleDto } from './dto/search-rental-vehicle.dto';
import { AddMaintenanceDto } from './dto/add-maintenance.dto';

type RentalVehicleUploadFiles = {
  vehicleRegistrationFront?: Express.Multer.File;
  vehicleRegistrationBack?: Express.Multer.File;
};

function mapVehicleRegistrationFiles(
  files?: Record<string, Express.Multer.File[]>,
): RentalVehicleUploadFiles {
  return {
    vehicleRegistrationFront: files?.vehicleRegistrationFront?.[0],
    vehicleRegistrationBack: files?.vehicleRegistrationBack?.[0],
  };
}


@ApiTags('rental-vehicles')
@Controller('rental-vehicles')
export class RentalVehiclesController {
  constructor(private readonly service: RentalVehiclesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Đăng ký xe cho thuê' })
  @ApiCreatedResponse({ description: 'Đăng ký xe thành công' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'vehicleRegistrationFront', maxCount: 1 },
        { name: 'vehicleRegistrationBack', maxCount: 1 },
      ],
      imageMulterOptions,
    ),
  )
  create(
    @UploadedFiles() files: Record<string, Express.Multer.File[]> = {},
    @Body() dto: CreateRentalVehicleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.userId, dto, mapVehicleRegistrationFiles(files));
  }

  @Get('me')
  @RequireAuth()
  @ApiOperation({ summary: 'Danh sách xe cho thuê của tôi' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RentalVehicleApprovalStatus,
  })
  @ApiOkResponse({ description: 'Danh sách xe của user' })
  findMyVehicles(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RentalVehicleApprovalStatus,
  ) {
    return this.service.findMyVehicles(user.userId, { status });
  }

  @Get('favorites')
  @RequireAuth()
  @ApiOperation({ summary: 'Danh sách xe cho thuê yêu thích của tôi' })
  @ApiOkResponse({ description: 'Danh sách xe được yêu thích' })
  findFavorites(@CurrentUser() user: RequestUser) {
    return this.service.findFavoritesByUser(user.userId);
  }  @Post(':licensePlate/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm xe vào danh sách yêu thích' })
  async favorite(
    @Param('licensePlate') licensePlate: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.service.favorite(licensePlate, user.userId);
    return { message: 'Added to favorites' };
  }

  @Delete(':licensePlate/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa xe khỏi danh sách yêu thích' })
  async unfavorite(
    @Param('licensePlate') licensePlate: string,
    @CurrentUser() user: RequestUser,
  ) {
    await this.service.unfavorite(licensePlate, user.userId);
    return { message: 'Removed from favorites' };
  }

  @Get('search')
  @ApiOperation({ summary: 'Tìm kiếm xe cho thuê với bộ lọc' })
  @ApiOkResponse({ description: 'Danh sách xe thỏa điều kiện' })
  search(@Query() dto: SearchRentalVehicleDto) {
    return this.service.search(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách xe cho thuê' })
  @ApiQuery({ name: 'contractId', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RentalVehicleApprovalStatus,
  })
  @ApiQuery({
    name: 'availability',
    required: false,
    enum: RentalVehicleAvailabilityStatus,
  })
  @ApiOkResponse({ description: 'Danh sách xe' })
  findAll(
    @Query('contractId') contractId?: string,
    @Query('status') status?: RentalVehicleApprovalStatus,
    @Query('availability') availability?: RentalVehicleAvailabilityStatus,
  ) {
    return this.service.findAll({
      contractId: contractId ? Number(contractId) : undefined,
      status,
      availability,
    });
  }

  @Get(':licensePlate')
  @ApiOperation({ summary: 'Chi tiết xe cho thuê' })
  @ApiOkResponse({ description: 'Chi tiết xe' })
  findOne(@Param('licensePlate') licensePlate: string) {
    return this.service.findOne(licensePlate);
  }

  @Patch(':licensePlate')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật thông tin xe cho thuê (giá, mô tả, yêu cầu)' })
  @ApiOkResponse({ description: 'Cập nhật xe thành công' })
  update(
    @Param('licensePlate') licensePlate: string,
    @Body() dto: UpdateRentalVehicleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(user.userId, licensePlate, dto);
  }

  @Patch(':licensePlate/approve')
  @RequireAuth()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Duyệt xe cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Xe đã được duyệt' })
  approve(@Param('licensePlate') licensePlate: string) {
    return this.service.approve(licensePlate);
  }

  @Patch(':licensePlate/reject')
  @RequireAuth()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Từ chối xe cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Xe đã bị từ chối' })
  reject(
    @Param('licensePlate') licensePlate: string,
    @Body() dto: RejectRentalVehicleDto,
  ) {
    return this.service.reject(licensePlate, dto.rejectedReason);
  }

  @Patch(':licensePlate/disable')
  @RequireAuth()
  @ApiOperation({
    summary: 'Tạm ngưng xe để bảo dưỡng hoặc bảo trì',
  })
  @ApiOkResponse({ description: 'Xe đã được chuyển sang trạng thái bảo trì' })
  disable(
    @Param('licensePlate') licensePlate: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.disable(user.userId, licensePlate);
  }

  @Patch(':licensePlate/enable')
  @RequireAuth()
  @ApiOperation({
    summary: 'Mở lại xe từ trạng thái bảo trì',
  })
  @ApiOkResponse({ description: 'Xe đã được mở lại' })
  enable(
    @Param('licensePlate') licensePlate: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.enable(user.userId, licensePlate);
  }

  @Post('maintenance')
  @RequireAuth()
  @ApiOperation({ summary: 'Chủ xe: Thêm lịch bảo trì xe' })
  @ApiCreatedResponse({ description: 'Đã thêm lịch bảo trì' })
  addMaintenance(
    @CurrentUser() user: RequestUser,
    @Body() dto: AddMaintenanceDto,
  ) {
    return this.service.addMaintenance(user.userId, dto);
  }

  @Delete(':licensePlate')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa xe cho thuê' })
  @ApiOkResponse({ description: 'Đã xóa xe' })
  remove(
    @Param('licensePlate') licensePlate: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(user.userId, licensePlate);
  }
}
