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
import { VehicleInformationService } from './vehicle-information.service';
import { CreateVehicleInformationDto } from './dto/create-vehicle-information.dto';
import { UpdateVehicleInformationDto } from './dto/update-vehicle-information.dto';

@ApiTags('vehicle-information')
@Controller('vehicle-information')
export class VehicleInformationController {
  constructor(
    private readonly vehicleInformationService: VehicleInformationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create vehicle definition' })
  @ApiCreatedResponse({ description: 'Vehicle information created' })
  create(@Body() dto: CreateVehicleInformationDto) {
    return this.vehicleInformationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List vehicle definitions' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Vehicle definition list' })
  findAll(
    @Query('type') type?: string,
    @Query('brand') brand?: string,
    @Query('model') model?: string,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.vehicleInformationService.findAll({
      type,
      brand,
      model,
      active,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle information detail' })
  @ApiOkResponse({ description: 'Vehicle information detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleInformationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vehicle information' })
  @ApiOkResponse({ description: 'Vehicle information updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleInformationDto,
  ) {
    return this.vehicleInformationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle information' })
  @ApiOkResponse({ description: 'Vehicle information removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehicleInformationService.remove(id);
  }
}
