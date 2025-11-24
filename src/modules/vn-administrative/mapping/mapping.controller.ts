import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdministrativeMappingService } from './mapping.service';
import { TranslateAddressTextDto } from './dto/translate-address-text.dto';
import { AdminUnitMapping } from './admin-reform-mapping.entity';
import { EnrichDestinationsDto } from './dto/enrich-destinations.dto';

@ApiTags('Vietnam Administrative (Mapping)')
@Controller('vn-admin/mapping')
export class AdministrativeMappingController {
  constructor(private readonly service: AdministrativeMappingService) {}

  @Post('translate')
  @ApiOperation({
    summary:
      'Chuyển đổi địa chỉ cũ sang hệ thống hành chính mới',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        oldAddress: { type: 'string' },
        newAddress: { type: 'string' },
      },
    },
  })
  translate(
    @Body() dto: TranslateAddressTextDto,
  ): Promise<{ oldAddress: string; newAddress: string }> {
    return this.service.translate(dto);
  }

  @Post('translate-address-text')
  @ApiOperation({
    summary:
      'Chuyển đổi địa chỉ dạng văn bản sang đơn vị hành chính mới',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        oldAddress: { type: 'string' },
        newAddress: { type: 'string' },
      },
    },
  })
  translateAddressText(
    @Body() dto: TranslateAddressTextDto,
  ): Promise<{ oldAddress: string; newAddress: string }> {
    return this.service.translate(dto);
  }

  @Get('legacy-wards/:code')
  @ApiOperation({
    summary: 'Tra cứu xã/phường cũ đã được sắp xếp lại như thế nào',
  })
  @ApiOkResponse({ type: AdminUnitMapping, isArray: true })
  findByLegacyWard(
    @Param('code') code: string,
  ): Promise<AdminUnitMapping[]> {
    return this.service.findByOldWard(code);
  }

  @Get('reform-communes/:code')
  @ApiOperation({
    summary: 'Tìm các đơn vị cũ được gộp vào xã/phường sau sáp nhập',
  })
  @ApiOkResponse({ type: AdminUnitMapping, isArray: true })
  findByReformCommune(
    @Param('code') code: string,
  ): Promise<AdminUnitMapping[]> {
    return this.service.findByNewCommune(code);
  }

  @Get('destinations/:destinationId/translate')
  @ApiOperation({
    summary:
      'Phân tích địa chỉ địa điểm và trả về mã hành chính cũ/mới',
  })
  @ApiOkResponse({
    description:
      'Thông tin mã tỉnh/huyện/xã cũ và mới cùng địa chỉ gợi ý sau sáp nhập',
  })
  translateDestination(
    @Param('destinationId', ParseIntPipe) destinationId: number,
  ) {
    return this.service.translateDestination(destinationId);
  }

  @Post('destinations/enrich')
  @ApiOperation({
    summary:
      'Bổ sung thông tin quận/huyện cho toàn bộ địa điểm dựa trên dữ liệu hành chính',
  })
  @ApiOkResponse({
    description:
      'Kết quả thống kê sau khi chạy, mặc định ở chế độ dry-run để rà soát',
  })
  enrichDestinations(
    @Body() dto: EnrichDestinationsDto = new EnrichDestinationsDto(),
  ) {
    return this.service.enrichDestinations(dto);
  }
}
