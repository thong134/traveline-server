import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LegacyAdministrativeService } from './legacy.service';
import { LegacyProvince } from './entities/legacy-province.entity';
import { LegacyDistrict } from './entities/legacy-district.entity';
import { LegacyWard } from './entities/legacy-ward.entity';

@ApiTags('Vietnam Administrative (Legacy)')
@Controller('vn-admin/legacy')
export class LegacyAdministrativeController {
  constructor(private readonly service: LegacyAdministrativeService) {}

  @Get('provinces')
  @ApiOperation({
    summary: 'Danh sách tỉnh trước sáp nhập (63 tỉnh)',
  })
  @ApiOkResponse({ type: LegacyProvince, isArray: true })
  listProvinces(@Query('search') search?: string): Promise<LegacyProvince[]> {
    return this.service.findProvinces({ search });
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
  @ApiOperation({ summary: 'Chi tiết huyện trước sáp nhập (có thể kèm xã/phường)' })
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
