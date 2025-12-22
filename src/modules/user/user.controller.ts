import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateInitialProfileDto } from './dto/update-initial-profile.dto';
import { UpdateVerificationInfoDto } from './dto/update-verification-info.dto';
import { UpdateHobbiesDto } from './dto/update-hobbies.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageMulterOptions } from '../../common/upload/image-upload.config';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { assertImageFile } from '../../common/upload/image-upload.utils';
import type { Express } from 'express';

@ApiTags('users')
@RequireAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('profile/me')
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  @ApiOkResponse({ description: 'User detail' })
  findMe(@CurrentUser() user: RequestUser) {
    return this.usersService.findOne(user.userId);
  }

  @Patch('profile/initial')
  @ApiOperation({ summary: 'Cập nhật thông tin bước đầu' })
  @ApiOkResponse({ description: 'Updated user' })
  updateInitial(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateInitialProfileDto,
  ) {
    return this.usersService.updateInitialProfile(user.userId, dto);
  }

  @Patch('profile/verification-info')
  @ApiOperation({ summary: 'Cập nhật thông tin xác thực (Email, Phone, Citizen ID)' })
  @ApiOkResponse({ description: 'Updated user, verification flags reset' })
  updateVerification(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateVerificationInfoDto,
  ) {
    return this.usersService.updateVerificationInfo(user.userId, dto);
  }

  @Patch('profile/hobbies')
  @ApiOperation({ summary: 'Cập nhật sở thích/categories du lịch' })
  @ApiOkResponse({ description: 'Updated user' })
  updateHobbies(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateHobbiesDto,
  ) {
    return this.usersService.updateHobbies(user.userId, dto.hobbies);
  }

  @Patch('profile/avatar')
  @ApiOperation({ summary: 'Cập nhật avatar người dùng' })
  @UseInterceptors(FileInterceptor('avatar', imageMulterOptions))
  @ApiOkResponse({ description: 'Avatar updated' })
  async updateAvatar(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    assertImageFile(file, { fieldName: 'avatar' });
    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: `traveline/users/${user.userId}`,
      publicId: 'avatar',
    });
    return this.usersService.updateAvatarUrl(user.userId, upload.url);
  }

  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Xóa avatar người dùng' })
  @ApiOkResponse({ description: 'Avatar deleted' })
  deleteAvatar(@CurrentUser() user: RequestUser) {
    return this.usersService.deleteAvatarUrl(user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng (Admin)' })
  @ApiOkResponse({ description: 'List of users' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết người dùng theo ID' })
  @ApiOkResponse({ description: 'User detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật người dùng theo ID (Admin/General)' })
  @ApiOkResponse({ description: 'Updated user' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa người dùng theo ID' })
  @ApiOkResponse({ description: 'Delete confirmation' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
