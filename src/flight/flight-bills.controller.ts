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
import { FlightBillsService } from './flight-bills.service';
import { CreateFlightBillDto } from './dto/create-flight-bill.dto';
import { UpdateFlightBillDto } from './dto/update-flight-bill.dto';
import { FlightBillStatus } from './flight-bill.entity';

@ApiTags('flight-bills')
@Controller('flight/bills')
export class FlightBillsController {
  constructor(private readonly service: FlightBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create flight bill' })
  @ApiCreatedResponse({ description: 'Flight bill created' })
  create(@Body() dto: CreateFlightBillDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List flight bills' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'flightId', required: false, type: Number })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: FlightBillStatus })
  @ApiOkResponse({ description: 'Flight bill list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('flightId') flightId?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('status') status?: FlightBillStatus,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      flightId: flightId ? Number(flightId) : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flight bill detail' })
  @ApiOkResponse({ description: 'Flight bill detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update flight bill' })
  @ApiOkResponse({ description: 'Flight bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFlightBillDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove flight bill' })
  @ApiOkResponse({ description: 'Flight bill removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
