import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { RentalBillsService } from './rental-bills.service';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import { RentalBillStatus } from './rental-bill.entity';

@ApiTags('rental-bills')
@Controller('rental-bills')
export class RentalBillsController {
  constructor(private readonly service: RentalBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create rental bill for customer booking' })
  @ApiCreatedResponse({ description: 'Rental bill created' })
  create(@Body() dto: CreateRentalBillDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rental bills' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RentalBillStatus })
  @ApiQuery({ name: 'contractId', required: false, type: Number })
  @ApiOkResponse({ description: 'Rental bill list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: RentalBillStatus,
    @Query('contractId') contractId?: string,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      status,
      contractId: contractId ? Number(contractId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental bill detail' })
  @ApiOkResponse({ description: 'Rental bill detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rental bill (status or information)' })
  @ApiOkResponse({ description: 'Rental bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalBillDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete rental bill' })
  @ApiOkResponse({ description: 'Rental bill removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
