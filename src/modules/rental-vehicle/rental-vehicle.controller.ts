import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { RentalVehiclesService } from './rental-vehicle.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from './entities/rental-vehicle.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import {
  RejectRentalVehicleDto,
  UpdateRentalVehicleStatusDto,
} from './dto/manage-rental-vehicle.dto';

@ApiTags('rental-vehicles')
@Controller('rental-vehicles')
export class RentalVehiclesController {
  constructor(private readonly service: RentalVehiclesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Đăng ký xe cho thuê' })
  @ApiCreatedResponse({ description: 'Đăng ký xe thành công' })
  create(@Body() dto: CreateRentalVehicleDto) {
    return this.service.create(dto);
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
  @ApiOperation({ summary: 'Cập nhật thông tin xe cho thuê' })
  @ApiOkResponse({ description: 'Cập nhật xe thành công' })
  update(
    @Param('licensePlate') licensePlate: string,
    @Body() dto: UpdateRentalVehicleDto,
  ) {
    return this.service.update(licensePlate, dto);
  }

  @Patch(':licensePlate/status')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái xe cho thuê' })
  @ApiOkResponse({ description: 'Trạng thái xe đã được cập nhật' })
  updateStatus(
    @Param('licensePlate') licensePlate: string,
    @Body() dto: UpdateRentalVehicleStatusDto,
  ) {
    return this.service.updateStatus(licensePlate, {
      status: dto.status,
      availability: dto.availability,
      rejectedReason: dto.rejectedReason,
    });
  }

  @Patch(':licensePlate/approve')
  @RequireAuth()
  @ApiOperation({ summary: 'Duyệt xe cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Xe đã được duyệt' })
  approve(@Param('licensePlate') licensePlate: string) {
    return this.service.approve(licensePlate);
  }

  @Patch(':licensePlate/reject')
  @RequireAuth()
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
  disable(@Param('licensePlate') licensePlate: string) {
    return this.service.disable(licensePlate);
  }

  @Delete(':licensePlate')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa xe cho thuê' })
  @ApiOkResponse({ description: 'Đã xóa xe' })
  remove(@Param('licensePlate') licensePlate: string) {
    return this.service.remove(licensePlate);
  }
}
