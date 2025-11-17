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
    summary: 'List legacy provinces (63 provinces before reform)',
  })
  @ApiOkResponse({ type: LegacyProvince, isArray: true })
  listProvinces(@Query('search') search?: string): Promise<LegacyProvince[]> {
    return this.service.findProvinces({ search });
  }

  @Get('provinces/:code')
  @ApiOperation({
    summary: 'Get a legacy province with optional district/ward tree',
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
  @ApiOperation({ summary: 'Get a legacy district with optional wards' })
  @ApiOkResponse({ type: LegacyDistrict })
  getDistrict(
    @Param('code') code: string,
    @Query('includeWards') includeWards = 'false',
  ): Promise<LegacyDistrict> {
    return this.service.findDistrictByCode(code, includeWards === 'true');
  }

  @Get('districts/:code/wards')
  @ApiOperation({ summary: 'List wards of a legacy district' })
  @ApiOkResponse({ type: LegacyWard, isArray: true })
  listWardsOfDistrict(@Param('code') code: string): Promise<LegacyWard[]> {
    return this.service.findWardsByDistrict(code);
  }

  @Get('wards/:code')
  @ApiOperation({ summary: 'Get a legacy ward/commune' })
  @ApiOkResponse({ type: LegacyWard })
  getWard(@Param('code') code: string): Promise<LegacyWard> {
    return this.service.findWardByCode(code);
  }
}
