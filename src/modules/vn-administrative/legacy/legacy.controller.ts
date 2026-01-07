import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LegacyAdministrativeService } from './legacy.service';
import { LegacyProvince } from './entities/legacy-province.entity';
import { LegacyDistrict } from './entities/legacy-district.entity';
import { LegacyWard } from './entities/legacy-ward.entity';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageMulterOptions } from '../../../common/upload/image-upload.config';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { assertImageFile } from '../../../common/upload/image-upload.utils';
import type { Express } from 'express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';
import { Post, Body } from '@nestjs/common';

@ApiTags('legacy-administrative')
@Controller('vn-admin/legacy')
export class LegacyAdministrativeController {
  constructor(
    private readonly service: LegacyAdministrativeService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('provinces')
  @ApiOperation({
    summary: 'Danh sách tỉnh trước sáp nhập (63 tỉnh)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm theo tên, tên tiếng Anh hoặc mã (không bắt buộc)',
  })
  @ApiOkResponse({ type: LegacyProvince, isArray: true })
  listProvinces(@Query('search') search?: string): Promise<LegacyProvince[]> {
    return this.service.findProvinces({ search });
  }

  @Post('provinces/upload/avatar')
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
      folder: 'traveline/legacy/provinces/avatars',
    });
    
    return this.service.updateProvince(code, { avatarUrl: upload.url });
  }

  @Get('provinces/:code')
  @ApiOperation({
    summary: 'Chi tiết tỉnh trước sáp nhập (có thể kèm huyện/xã)',
  })
  @ApiOkResponse({ type: LegacyProvince })
  getProvince(
    @Param('code') code: string,
    @Query('includeDistricts') includeDistricts = 'false',
    @Query('includeWards') includeWards = 'false',
  ): Promise<LegacyProvince> {
    const includeDistrictsFlag = includeDistricts === 'true';
    const includeWardsFlag = includeWards === 'true';
    return this.service.findProvinceByCode(code, {
      includeDistricts: includeDistrictsFlag,
      includeWards: includeWardsFlag,
    });
  }

  @Get('districts/:code')
  @ApiOperation({
    summary: 'Chi tiết huyện trước sáp nhập (có thể kèm xã/phường)',
  })
  @ApiOkResponse({ type: LegacyDistrict })
  getDistrict(
    @Param('code') code: string,
    @Query('includeWards') includeWards = 'false',
  ): Promise<LegacyDistrict> {
    return this.service.findDistrictByCode(code, includeWards === 'true');
  }

  @Get('districts/:code/wards')
  @ApiOperation({ summary: 'Danh sách xã/phường của huyện trước sáp nhập' })
  @ApiOkResponse({ type: LegacyWard, isArray: true })
  listWardsOfDistrict(@Param('code') code: string): Promise<LegacyWard[]> {
    return this.service.findWardsByDistrict(code);
  }

  @Get('wards/:code')
  @ApiOperation({ summary: 'Chi tiết xã/phường trước sáp nhập' })
  @ApiOkResponse({ type: LegacyWard })
  getWard(@Param('code') code: string): Promise<LegacyWard> {
    return this.service.findWardByCode(code);
  }
}
