import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
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
  ApiTags,
} from '@nestjs/swagger';
import { RentalContractsService } from './rental-contracts.service';
import { CreateRentalContractDto } from './dto/create-rental-contract.dto';
import { UpdateRentalContractDto } from './dto/update-rental-contract.dto';
import { RentalContractStatus } from './rental-contract.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request';

@ApiTags('rental-contracts')
@Controller('rental-contracts')
export class RentalContractsController {
  constructor(private readonly service: RentalContractsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Register a rental contract for vehicle owners' })
  @ApiCreatedResponse({ description: 'Contract created' })
  create(
    @Body() dto: CreateRentalContractDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (dto.userId !== req.user.userId) {
      throw new ForbiddenException('Cannot create contracts for other users');
    }
    return this.service.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List rental contracts' })
  @ApiOkResponse({ description: 'Contract list' })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: RentalContractStatus,
  ) {
    return this.service.findAll(
      {
        userId: req.user.userId,
        status,
      },
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get rental contract detail' })
  @ApiOkResponse({ description: 'Contract detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.findOne(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update rental contract (admin or owner)' })
  @ApiOkResponse({ description: 'Contract updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalContractDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.update(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete rental contract' })
  @ApiOkResponse({ description: 'Contract removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.remove(id, req.user.userId);
  }
}
