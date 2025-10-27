import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DestinationsService } from './destinations.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a destination' })
  @ApiCreatedResponse({ description: 'Destination created' })
  create(@Body() dto: CreateDestinationDto) {
    return this.destinationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search destinations' })
  @ApiQuery({ name: 'q', required: false, description: 'Search keyword by name or type' })
  @ApiQuery({ name: 'available', required: false, description: 'Filter by availability (true/false)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of items', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Paginate starting index', type: Number })
  @ApiOkResponse({ description: 'Destination list' })
  findAll(
    @Query('q') q?: string,
    @Query('available') available?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.destinationsService.findAll({
      q,
      available: typeof available === 'string' ? available === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a destination by id' })
  @ApiOkResponse({ description: 'Destination detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update destination' })
  @ApiOkResponse({ description: 'Destination updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDestinationDto) {
    return this.destinationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete destination' })
  @ApiOkResponse({ description: 'Destination deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.remove(id);
  }
}