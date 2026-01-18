import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DestinationBillService } from './destination-bill.service';
import { CreateDestinationBillDto } from './dto/create-destination-bill.dto';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { CurrentUser, RequestUser } from '../auth/decorators/current-user.decorator';
import { DestinationBill } from './entities/destination-bill.entity';

@ApiTags('destination-bills')
@Controller('destination-bills')
export class DestinationBillController {
  constructor(private readonly service: DestinationBillService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Mua vé tham quan' })
  create(@Body() dto: CreateDestinationBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(dto, user.userId);
  }

  @Get()
  @RequireAuth()
  @ApiOperation({ summary: 'Lịch sử mua vé của tôi' })
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAllByUser(user.userId);
  }

  @Get(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Chi tiết hóa đơn mua vé' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.findOne(id, user.userId);
  }
}
