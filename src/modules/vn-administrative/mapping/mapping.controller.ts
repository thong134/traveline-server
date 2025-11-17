import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AdministrativeMappingService,
  AddressTranslation,
} from './mapping.service';
import { TranslateAddressDto } from './dto/translate-address.dto';

@ApiTags('Vietnam Administrative (Mapping)')
@Controller('vn-admin/mapping')
export class AdministrativeMappingController {
  constructor(private readonly service: AdministrativeMappingService) {}

  @Post('translate')
  @ApiOperation({
    summary:
      'Translate a legacy (before reform) address into the new administrative structure',
  })
  @ApiOkResponse({ type: Object, isArray: true })
  translate(@Body() dto: TranslateAddressDto): Promise<AddressTranslation[]> {
    return this.service.translate(dto);
  }

  @Get('legacy-wards/:code')
  @ApiOperation({
    summary: 'Look up how a specific legacy ward/commune was reorganised',
  })
  @ApiOkResponse({ type: Object, isArray: true })
  findByLegacyWard(@Param('code') code: string): Promise<AddressTranslation[]> {
    return this.service.findByOldWard(code);
  }

  @Get('reform-communes/:code')
  @ApiOperation({
    summary: 'Find all legacy units merged into a reform commune',
  })
  @ApiOkResponse({ type: Object, isArray: true })
  findByReformCommune(
    @Param('code') code: string,
  ): Promise<AddressTranslation[]> {
    return this.service.findByNewCommune(code);
  }
}
