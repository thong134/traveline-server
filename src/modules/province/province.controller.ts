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

@ApiTags('provinces')
@Controller('provinces')
export class ProvincesController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo tỉnh/thành' })
  @ApiCreatedResponse({ description: 'Province created' })
  create(@Body() dto: CreateProvinceDto) {
    return this.provincesService.create(dto);
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
    @Query('region') region?: string,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.provincesService.findAll({ q, region, active });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tỉnh/thành' })
  @ApiOkResponse({ description: 'Province detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.provincesService.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật tỉnh/thành' })
  @ApiOkResponse({ description: 'Province updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProvinceDto,
  ) {
    return this.provincesService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa tỉnh/thành' })
  @ApiOkResponse({ description: 'Province removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.provincesService.remove(id);
  }
}
