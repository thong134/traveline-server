import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ReformAdministrativeService } from './reform.service';
import { ReformProvince } from './entities/reform-province.entity';
import { ReformCommune } from './entities/reform-commune.entity';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { imageMulterOptions } from '../../../common/upload/image-upload.config';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { assertImageFile } from '../../../common/upload/image-upload.utils';
import type { Express } from 'express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';
import { Post, Body } from '@nestjs/common';

@ApiTags('reform-administrative')
@Controller('vn-admin/reform')
export class ReformAdministrativeController {
  constructor(
    private readonly service: ReformAdministrativeService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('provinces')
  @ApiOperation({
    summary: 'Danh sách tỉnh sau sáp nhập (34 tỉnh)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm theo tên, tên tiếng Anh hoặc mã (không bắt buộc)',
  })
  @ApiOkResponse({ type: ReformProvince, isArray: true })
  listProvinces(@Query('search') search?: string): Promise<ReformProvince[]> {
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
      folder: 'traveline/reform/provinces/avatars',
    });

    return this.service.updateProvince(code, { avatarUrl: upload.url });
  }

  @Get('provinces/:code')
  @ApiOperation({
    summary: 'Chi tiết tỉnh sau sáp nhập (có thể kèm xã/phường)',
  })
  @ApiOkResponse({ type: ReformProvince })
  async getProvince(
    @Param('code') code: string,
    @Query('includeCommunes') includeCommunes = 'false',
  ): Promise<ReformProvince & { communes?: ReformCommune[] }> {
    const province = await this.service.findProvinceByCode(
      code,
      includeCommunes === 'true',
    );
    if (includeCommunes === 'true') {
      const communes = await this.service.findCommunesByProvince(code);
      return { ...province, communes };
    }
    return province;
  }

  @Get('provinces/:code/communes')
  @ApiOperation({ summary: 'Danh sách xã/phường thuộc tỉnh sau sáp nhập' })
  @ApiOkResponse({ type: ReformCommune, isArray: true })
  listCommunes(@Param('code') code: string): Promise<ReformCommune[]> {
    return this.service.findCommunesByProvince(code);
  }

  @Get('communes/:code')
  @ApiOperation({ summary: 'Chi tiết xã/phường sau sáp nhập' })
  @ApiOkResponse({ type: ReformCommune })
  getCommune(@Param('code') code: string): Promise<ReformCommune> {
    return this.service.findCommuneByCode(code);
  }
}
