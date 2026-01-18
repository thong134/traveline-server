import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdministrativeMappingService } from './mapping.service';
import { AdminUnitMapping } from './admin-reform-mapping.entity';
import { EnrichDestinationsDto } from './dto/enrich-destinations.dto';
import { ConvertAddressDto } from './dto/convert-address.dto';
import {
  ConvertNewToOldDetailsDto,
  ConvertOldToNewDetailsDto,
} from './dto/convert-details.dto';

@ApiTags('mapping-administrative')
@Controller('vn-admin/mapping')
export class AdministrativeMappingController {
  constructor(private readonly service: AdministrativeMappingService) {}

  @Post('convert/old-to-new-address')
  @ApiOperation({
    summary: 'Chuyển đổi địa chỉ cũ sang địa chỉ mới (dạng text)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        newAddress: { type: 'string' },
      },
    },
  })
  convertOldToNewAddress(
    @Body() dto: ConvertAddressDto,
  ): Promise<{ newAddress: string }> {
    return this.service.convertOldToNewAddress(dto);
  }

  @Post('convert/new-to-old-address')
  @ApiOperation({
    summary: 'Chuyển đổi địa chỉ mới sang các địa chỉ cũ tương ứng (dạng text)',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        oldAddresses: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  convertNewToOldAddress(
    @Body() dto: ConvertAddressDto,
  ): Promise<{ oldAddresses: string[] }> {
    return this.service.convertNewToOldAddress(dto);
  }

  @Post('convert/old-to-new-details')
  @ApiOperation({
    summary: 'Chuyển đổi chi tiết địa chỉ cũ sang mới',
  })
  convertOldToNewDetails(@Body() dto: ConvertOldToNewDetailsDto) {
    return this.service.convertOldToNewDetails(dto);
  }

  @Post('convert/new-to-old-details')
  @ApiOperation({
    summary:
      'Chuyển đổi chi tiết địa chỉ mới sang các chi tiết địa chỉ cũ tương ứng',
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          province: { type: 'object' },
          district: { type: 'object' },
          ward: { type: 'object' },
        },
      },
    },
  })
  convertNewToOldDetails(@Body() dto: ConvertNewToOldDetailsDto) {
    return this.service.convertNewToOldDetails(dto);
  }

  @Get('legacy-wards/:code')
  @ApiOperation({
    summary: 'Tra cứu xã/phường cũ đã được sắp xếp lại như thế nào',
  })
  @ApiOkResponse({ type: AdminUnitMapping, isArray: true })
  findByLegacyWard(@Param('code') code: string): Promise<AdminUnitMapping[]> {
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
    summary: 'Phân tích địa chỉ địa điểm và trả về mã hành chính cũ/mới',
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

  @Post('destinations/enrich-address')
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

  @Get('debug/communes')
  @ApiOperation({ summary: 'Debug tìm kiếm tên xã mới' })
  debugCommunes(@Query('q') q: string) {
    return this.service.debugSearchCommunes(q);
  }
}
