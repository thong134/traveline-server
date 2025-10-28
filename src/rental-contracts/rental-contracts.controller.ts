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
import { RentalContractsService } from './rental-contracts.service';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import { RentalContractStatus } from './rental-contract.entity';

@ApiTags('rental-contracts')
@Controller('rental-contracts')
export class RentalContractsController {
  constructor(private readonly service: RentalContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a rental contract for vehicle owners' })
  @ApiCreatedResponse({ description: 'Contract created' })
  create(@Body() dto: CreateRentalContractDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rental contracts' })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: RentalContractStatus })
  @ApiOkResponse({ description: 'Contract list' })
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: RentalContractStatus,
  ) {
    return this.service.findAll({
      userId: userId ? Number(userId) : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental contract detail' })
  @ApiOkResponse({ description: 'Contract detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rental contract (admin or owner)' })
  @ApiOkResponse({ description: 'Contract updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalContractDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete rental contract' })
  @ApiOkResponse({ description: 'Contract removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
