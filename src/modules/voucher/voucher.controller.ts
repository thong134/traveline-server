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
import { VouchersService } from './voucher.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';

@ApiTags('vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Tạo voucher mới' })
  @ApiCreatedResponse({ description: 'Voucher created' })
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách voucher' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'code', required: false })
  @ApiOkResponse({ description: 'Voucher list' })
  findAll(
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
    @Query('code') code?: string,
  ) {
    return this.vouchersService.findAll({ active, code });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết voucher' })
  @ApiOkResponse({ description: 'Voucher detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Cập nhật voucher' })
  @ApiOkResponse({ description: 'Voucher updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVoucherDto) {
    return this.vouchersService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa voucher' })
  @ApiOkResponse({ description: 'Voucher removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.remove(id);
  }
}
