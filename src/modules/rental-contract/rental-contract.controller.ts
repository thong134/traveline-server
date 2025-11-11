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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RentalContractsService } from './rental-contract.service';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import { RentalContractStatus } from './entities/rental-contract.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('rental-contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rental-contracts')
export class RentalContractsController {
  constructor(private readonly service: RentalContractsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a rental contract for vehicle owners' })
  @ApiCreatedResponse({ description: 'Contract created' })
  create(
    @Body() dto: CreateRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rental contracts' })
  @ApiQuery({ name: 'status', required: false, enum: RentalContractStatus })
  @ApiOkResponse({ description: 'Contract list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RentalContractStatus,
  ) {
    return this.service.findAll(user.userId, {
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental contract detail' })
  @ApiOkResponse({ description: 'Contract detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rental contract (admin or owner)' })
  @ApiOkResponse({ description: 'Contract updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete rental contract' })
  @ApiOkResponse({ description: 'Contract removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
