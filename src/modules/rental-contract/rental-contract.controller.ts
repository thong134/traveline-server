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
import { RentalContractsService } from './rental-contract.service';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import { RentalContractStatus } from './entities/rental-contract.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import {
  RenewRentalContractDto,
  RejectRentalContractDto,
  UpdateRentalContractStatusDto,
} from './dto/manage-rental-contract.dto';

@ApiTags('rental-contracts')
@RequireAuth()
@Controller('rental-contracts')
export class RentalContractsController {
  constructor(private readonly service: RentalContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Đăng ký hợp đồng cho thuê xe' })
  @ApiCreatedResponse({ description: 'Tạo hợp đồng thành công' })
  create(
    @Body() dto: CreateRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách hợp đồng cho thuê' })
  @ApiQuery({ name: 'status', required: false, enum: RentalContractStatus })
  @ApiOkResponse({ description: 'Danh sách hợp đồng' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RentalContractStatus,
  ) {
    return this.service.findAll(user.userId, {
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết hợp đồng cho thuê' })
  @ApiOkResponse({ description: 'Chi tiết hợp đồng' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật hợp đồng (chủ xe hoặc quản trị viên)' })
  @ApiOkResponse({ description: 'Cập nhật hợp đồng thành công' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái hợp đồng cho thuê' })
  @ApiOkResponse({ description: 'Trạng thái hợp đồng đã được cập nhật' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalContractStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateStatus(id, user.userId, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Duyệt hợp đồng cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Hợp đồng đã được duyệt' })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Từ chối hợp đồng cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Hợp đồng đã bị từ chối' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRentalContractDto,
  ) {
    return this.service.reject(id, dto);
  }

  @Patch(':id/renew')
  @ApiOperation({ summary: 'Gia hạn hợp đồng đang tạm ngưng' })
  @ApiOkResponse({ description: 'Hợp đồng đã được gia hạn' })
  renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.renew(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hợp đồng cho thuê' })
  @ApiOkResponse({ description: 'Đã xóa hợp đồng' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
