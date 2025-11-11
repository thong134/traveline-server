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
import { VehicleCatalogService } from './vehicle-catalog.service';
import { CreateVehicleCatalogDto } from './dto/create-vehicle-catalog.dto';
import { UpdateVehicleCatalogDto } from './dto/update-vehicle-catalog.dto';

@ApiTags('vehicle-catalog')
@Controller('vehicle-catalog')
export class VehicleCatalogController {
  constructor(private readonly vehicleCatalogService: VehicleCatalogService) {}

  @Post()
  @ApiOperation({ summary: 'Create vehicle catalog entry' })
  @ApiCreatedResponse({ description: 'Vehicle catalog entry created' })
  create(@Body() dto: CreateVehicleCatalogDto) {
    return this.vehicleCatalogService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vehicle catalog entries' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiOkResponse({ description: 'Vehicle catalog list' })
  findAll(
    @Query('type') type?: string,
    @Query('brand') brand?: string,
    @Query('model') model?: string,
  ) {
    return this.vehicleCatalogService.findAll({ type, brand, model });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle catalog detail' })
  @ApiOkResponse({ description: 'Vehicle catalog detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleCatalogService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle catalog entry' })
  @ApiOkResponse({ description: 'Vehicle catalog entry updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleCatalogDto,
  ) {
    return this.vehicleCatalogService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle catalog entry' })
  @ApiOkResponse({ description: 'Vehicle catalog entry removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleCatalogService.remove(id);
  }
}
