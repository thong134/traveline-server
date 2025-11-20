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
import { FlightsService } from './flights.service';
import { CreateFlightDto } from './dto/create-flight.dto';
import { UpdateFlightDto } from './dto/update-flight.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('flights')
@Controller('flight/flights')
export class FlightsController {
  constructor(private readonly service: FlightsService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Create flight' })
  @ApiCreatedResponse({ description: 'Flight created' })
  create(@Body() dto: CreateFlightDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List flights' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'airline', required: false, type: String })
  @ApiQuery({ name: 'departureAirport', required: false, type: String })
  @ApiQuery({ name: 'arrivalAirport', required: false, type: String })
  @ApiOkResponse({ description: 'Flight list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('airline') airline?: string,
    @Query('departureAirport') departureAirport?: string,
    @Query('arrivalAirport') arrivalAirport?: string,
  ) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      airline: airline ?? undefined,
      departureAirport: departureAirport ?? undefined,
      arrivalAirport: arrivalAirport ?? undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get flight detail' })
  @ApiOkResponse({ description: 'Flight detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Update flight' })
  @ApiOkResponse({ description: 'Flight updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFlightDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Remove flight' })
  @ApiOkResponse({ description: 'Flight removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
