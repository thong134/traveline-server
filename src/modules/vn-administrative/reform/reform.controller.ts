import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReformAdministrativeService } from './reform.service';
import { ReformProvince } from './entities/reform-province.entity';
import { ReformCommune } from './entities/reform-commune.entity';

@ApiTags('reform-administrative')
@Controller('vn-admin/reform')
export class ReformAdministrativeController {
  constructor(private readonly service: ReformAdministrativeService) {}

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
