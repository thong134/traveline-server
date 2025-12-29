import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
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
import { ProvincesService } from './province.service';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';

import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageMulterOptions } from '../../common/upload/image-upload.config';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { assertImageFile } from '../../common/upload/image-upload.utils';
import type { Express } from 'express';
import {
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('provinces')
@Controller('provinces')
export class ProvincesController {
  constructor(
    private readonly provincesService: ProvincesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo tỉnh/thành' })
  @ApiCreatedResponse({ description: 'Province created' })
  create(@Body() dto: CreateProvinceDto) {
    return this.provincesService.create(dto);
  }

  @Post('upload/avatar')
  @RequireAuth()
  @ApiOperation({ summary: 'Tải lên avatar cho tỉnh (Code + File)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Mã của tỉnh (ví dụ: DN, HN)' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['code', 'file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', imageMulterOptions))
  async uploadAvatar(
    @Body('code') code: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    assertImageFile(file, { fieldName: 'file' });
    const upload = await this.cloudinaryService.uploadImage(file, {
      folder: 'traveline/provinces/avatars',
    });
    
    // Update the province record with the new avatar URL
    return this.provincesService.update(code, { avatarUrl: upload.url });
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách tỉnh/thành' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Free text search by name or code',
  })
  @ApiQuery({
    name: 'region',
    required: false,
    description: 'Filter by region',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filter by active flag',
    type: Boolean,
  })
  @ApiOkResponse({ description: 'Province list' })
  findAll(
    @Query('q') q?: string,
  ) {
    return this.provincesService.findAll({ q });
  }

  @Get(':code')
  @ApiOperation({ summary: 'Chi tiết tỉnh/thành' })
  @ApiOkResponse({ description: 'Province detail' })
  findOne(@Param('code') code: string) {
    return this.provincesService.findOne(code);
  }

  @Patch(':code')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật tỉnh/thành' })
  @ApiOkResponse({ description: 'Province updated' })
  update(
    @Param('code') code: string,
    @Body() dto: UpdateProvinceDto,
  ) {
    return this.provincesService.update(code, dto);
  }

  @Patch('bulk/update')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật nhiều tỉnh/thành' })
  @ApiOkResponse({ description: 'Provinces updated' })
  bulkUpdate(@Body() updates: { code: string; avatarUrl?: string }[]) {
    return this.provincesService.bulkUpdate(updates);
  }

  @Delete(':code')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa tỉnh/thành' })
  @ApiOkResponse({ description: 'Province removed' })
  remove(@Param('code') code: string) {
    return this.provincesService.remove(code);
  }
}
