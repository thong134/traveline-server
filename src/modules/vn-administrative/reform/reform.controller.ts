import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReformAdministrativeService } from './reform.service';
import { ReformProvince } from './entities/reform-province.entity';
import { ReformCommune } from './entities/reform-commune.entity';

@ApiTags('Vietnam Administrative (Reform)')
@Controller('vn-admin/reform')
export class ReformAdministrativeController {
  constructor(private readonly service: ReformAdministrativeService) {}

  @Get('provinces')
  @ApiOperation({
    summary: 'List reformed provinces (34 provinces after merge)',
  })
  @ApiOkResponse({ type: ReformProvince, isArray: true })
  listProvinces(@Query('search') search?: string): Promise<ReformProvince[]> {
    return this.service.findProvinces({ search });
  }

  @Get('provinces/:code')
  @ApiOperation({
    summary: 'Get a reformed province with optional commune list',
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
  @ApiOperation({ summary: 'List communes/wards of a reformed province' })
  @ApiOkResponse({ type: ReformCommune, isArray: true })
  listCommunes(@Param('code') code: string): Promise<ReformCommune[]> {
    return this.service.findCommunesByProvince(code);
  }

  @Get('communes/:code')
  @ApiOperation({ summary: 'Get a reformed commune/ward' })
  @ApiOkResponse({ type: ReformCommune })
  getCommune(@Param('code') code: string): Promise<ReformCommune> {
    return this.service.findCommuneByCode(code);
  }
}
