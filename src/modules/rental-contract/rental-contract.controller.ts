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
import type { Express } from 'express';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { RentalContractsService } from './rental-contract.service';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import { RentalContractStatus } from './entities/rental-contract.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user-role.enum';
import {
  RejectRentalContractDto,
  SuspendRentalContractDto,
} from './dto/manage-rental-contract.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { imageMulterOptions } from '../../common/upload/image-upload.config';
import { RequireVerification } from '../auth/decorators/require-verification.decorator';

@ApiTags('rental-contracts')
@RequireAuth()
@Controller('rental-contracts')
export class RentalContractsController {
  constructor(private readonly service: RentalContractsService) {}

  @RequireVerification()
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'businessRegisterPhoto', maxCount: 1 },
        { name: 'citizenFrontPhoto', maxCount: 1 },
        { name: 'citizenBackPhoto', maxCount: 1 },
      ],
      imageMulterOptions,
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Đăng ký hợp đồng cho thuê xe' })
  @ApiCreatedResponse({ description: 'Tạo hợp đồng thành công' })
  create(
    @Body() dto: CreateRentalContractDto,
    @CurrentUser() user: RequestUser,
    @UploadedFiles()
    files?: {
      businessRegisterPhoto?: Express.Multer.File[];
      citizenFrontPhoto?: Express.Multer.File[];
      citizenBackPhoto?: Express.Multer.File[];
    },
  ) {
    return this.service.create(user.userId, dto, {
      businessRegisterPhoto: files?.businessRegisterPhoto?.[0],
      citizenFrontPhoto: files?.citizenFrontPhoto?.[0],
      citizenBackPhoto: files?.citizenBackPhoto?.[0],
    });
  }

  @Get('me')
  @ApiOperation({ summary: 'Danh sách hợp đồng cho thuê của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: RentalContractStatus })
  @ApiOkResponse({ description: 'Danh sách hợp đồng của user' })
  findMyContracts(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RentalContractStatus,
  ) {
    return this.service.findMyContracts(user.userId, { status });
  }

  @Get()
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Danh sách hợp đồng cho thuê (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: RentalContractStatus })
  @ApiOkResponse({ description: 'Danh sách hợp đồng' })
  findAll(@Query('status') status?: RentalContractStatus) {
    return this.service.findAllForAdmin({ status });
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
  @ApiOperation({ summary: 'Cập nhật thông tin ngân hàng của hợp đồng' })
  @ApiOkResponse({ description: 'Cập nhật hợp đồng thành công' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Patch(':id/approve')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Duyệt hợp đồng cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Hợp đồng đã được duyệt' })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.service.approve(id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Từ chối hợp đồng cho thuê (quản trị viên)' })
  @ApiOkResponse({ description: 'Hợp đồng đã bị từ chối' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRentalContractDto,
  ) {
    return this.service.reject(id, dto);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Ngưng hợp tác (chủ xe)' })
  @ApiOkResponse({ description: 'Hợp đồng đã được ngưng' })
  suspend(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.suspend(id, user.userId, dto);
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
