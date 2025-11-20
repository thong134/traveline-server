import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { RentalVehiclesService } from './rental-vehicle.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from './entities/rental-vehicle.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';

@ApiTags('rental-vehicles')
@Controller('rental-vehicles')
export class RentalVehiclesController {
  constructor(private readonly service: RentalVehiclesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Register a vehicle for rental' })
  @ApiCreatedResponse({ description: 'Vehicle registered' })
  create(@Body() dto: CreateRentalVehicleDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rental vehicles' })
  @ApiQuery({ name: 'contractId', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RentalVehicleApprovalStatus,
  })
  @ApiQuery({
    name: 'availability',
    required: false,
    enum: RentalVehicleAvailabilityStatus,
  })
  @ApiOkResponse({ description: 'Vehicle list' })
  findAll(
    @Query('contractId') contractId?: string,
    @Query('status') status?: RentalVehicleApprovalStatus,
    @Query('availability') availability?: RentalVehicleAvailabilityStatus,
  ) {
    return this.service.findAll({
      contractId: contractId ? Number(contractId) : undefined,
      status,
      availability,
    });
  }

  @Get(':licensePlate')
  @ApiOperation({ summary: 'Get rental vehicle detail' })
  @ApiOkResponse({ description: 'Vehicle detail' })
  findOne(@Param('licensePlate') licensePlate: string) {
    return this.service.findOne(licensePlate);
  }

  @Patch(':licensePlate')
  @RequireAuth()
  @ApiOperation({ summary: 'Update rental vehicle data' })
  @ApiOkResponse({ description: 'Vehicle updated' })
  update(
    @Param('licensePlate') licensePlate: string,
    @Body() dto: UpdateRentalVehicleDto,
  ) {
    return this.service.update(licensePlate, dto);
  }

  @Delete(':licensePlate')
  @RequireAuth()
  @ApiOperation({ summary: 'Remove rental vehicle' })
  @ApiOkResponse({ description: 'Vehicle removed' })
  remove(@Param('licensePlate') licensePlate: string) {
    return this.service.remove(licensePlate);
  }
}
