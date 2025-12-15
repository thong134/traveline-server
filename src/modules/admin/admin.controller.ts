import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DestinationsService } from '../destination/destination.service';
import { RentalContractsService } from '../rental-contract/rental-contract.service';
import {
  RentalContractStatus,
  RentalContract,
} from '../rental-contract/entities/rental-contract.entity';
import { RentalVehiclesService } from '../rental-vehicle/rental-vehicle.service';
import {
  RentalVehicle,
  RentalVehicleApprovalStatus,
  RentalVehicleAvailabilityStatus,
} from '../rental-vehicle/entities/rental-vehicle.entity';
import { CooperationsService } from '../cooperation/cooperation.service';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { UserRole } from '../user/entities/user-role.enum';

@ApiTags('admin')
@ApiBearerAuth()
@RequireAuth(UserRole.Admin)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly destinationsService: DestinationsService,
    private readonly rentalContractsService: RentalContractsService,
    private readonly rentalVehiclesService: RentalVehiclesService,
    private readonly cooperationsService: CooperationsService,
  ) {}

  @Get('destinations')
  @ApiOperation({ summary: 'Danh sách địa điểm (admin)' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({
    name: 'available',
    required: false,
    description: 'Filter destinations by availability',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of destinations',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Pagination offset',
    type: Number,
  })
  @ApiOkResponse({ type: [Destination] })
  getDestinations(
    @Query('q') q?: string,
    @Query('available') available?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.destinationsService.findAll({
      q,
      available:
        typeof available === 'string'
          ? available.toLowerCase() === 'true'
          : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('rental-contracts')
  @ApiOperation({ summary: 'Danh sách hợp đồng cho thuê (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RentalContractStatus,
  })
  @ApiOkResponse({ type: [RentalContract] })
  getRentalContracts(@Query('status') status?: RentalContractStatus) {
    const normalizedStatus =
      typeof status === 'string' &&
      (Object.values(RentalContractStatus) as string[]).includes(status)
        ? status
        : undefined;

    return this.rentalContractsService.findAllForAdmin({
      status: normalizedStatus,
    });
  }

  @Get('rental-contracts/:id')
  @ApiOperation({ summary: 'Chi tiết hợp đồng cho thuê (admin)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: RentalContract })
  getRentalContract(@Param('id', ParseIntPipe) id: number) {
    return this.rentalContractsService.findOne(id, 0, { asAdmin: true });
  }

  @Get('rental-vehicles')
  @ApiOperation({ summary: 'Danh sách xe cho thuê (admin)' })
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
  @ApiOkResponse({ type: [RentalVehicle] })
  getRentalVehicles(
    @Query('contractId') contractId?: string,
    @Query('status') status?: RentalVehicleApprovalStatus,
    @Query('availability') availability?: RentalVehicleAvailabilityStatus,
  ) {
    const parsedContractId = contractId ? Number(contractId) : undefined;

    const normalizedStatus =
      typeof status === 'string' &&
      (Object.values(RentalVehicleApprovalStatus) as string[]).includes(status)
        ? status
        : undefined;

    const normalizedAvailability =
      typeof availability === 'string' &&
      (Object.values(RentalVehicleAvailabilityStatus) as string[]).includes(
        availability,
      )
        ? availability
        : undefined;

    return this.rentalVehiclesService.findAll({
      contractId: parsedContractId,
      status: normalizedStatus,
      availability: normalizedAvailability,
    });
  }

  @Get('cooperations')
  @ApiOperation({ summary: 'Danh sách đối tác hợp tác (admin)' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Filter by active status',
  })
  @ApiOkResponse({ type: [Cooperation] })
  getCooperations(
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('province') province?: string,
    @Query('active') active?: string,
  ) {
    return this.cooperationsService.findAll({
      type: type?.trim(),
      city: city?.trim(),
      province: province?.trim(),
      active:
        typeof active === 'string'
          ? active.toLowerCase() === 'true'
          : undefined,
    });
  }
}
