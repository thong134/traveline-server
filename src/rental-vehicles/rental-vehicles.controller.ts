import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RentalVehiclesService } from './rental-vehicles.service';
import { CreateRentalVehicleDto } from './dto/create-rental-vehicle.dto';
import { UpdateRentalVehicleDto } from './dto/update-rental-vehicle.dto';
import {
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from './rental-vehicle.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';

@ApiTags('rental-vehicles')
@Controller('rental-vehicles')
export class RentalVehiclesController {
  constructor(private readonly service: RentalVehiclesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Register a vehicle for rental' })
  @ApiCreatedResponse({ description: 'Vehicle registered' })
  create(
    @Body() dto: CreateRentalVehicleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
    @Request() req: AuthenticatedRequest,
    @Query('contractId') contractId?: string,
    @Query('status') status?: RentalVehicleApprovalStatus,
    @Query('availability') availability?: RentalVehicleAvailabilityStatus,
  ) {
    return this.service.findAll({
      contractId: contractId ? Number(contractId) : undefined,
      status,
      availability,
    }, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':licensePlate')
  @ApiOperation({ summary: 'Get rental vehicle detail' })
  @ApiOkResponse({ description: 'Vehicle detail' })
  findOne(
    @Param('licensePlate') licensePlate: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(licensePlate, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':licensePlate')
  @ApiOperation({ summary: 'Update rental vehicle data' })
  @ApiOkResponse({ description: 'Vehicle updated' })
  update(
    @Param('licensePlate') licensePlate: string,
    @Body() dto: UpdateRentalVehicleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.update(licensePlate, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':licensePlate')
  @ApiOperation({ summary: 'Remove rental vehicle' })
  @ApiOkResponse({ description: 'Vehicle removed' })
  remove(
    @Param('licensePlate') licensePlate: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.remove(licensePlate, req.user.userId);
  }
}
