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
import { RentalBillsService } from './rental-bill.service';
import { CreateRentalBillDto } from './dto/create-rental-bill.dto';
import { UpdateRentalBillDto } from './dto/update-rental-bill.dto';
import { RentalBillStatus } from './entities/rental-bill.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@ApiTags('rental-bills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rental-bills')
export class RentalBillsController {
  constructor(private readonly service: RentalBillsService) {}

  @Post()
  @ApiOperation({ summary: 'Create rental bill for customer booking' })
  @ApiCreatedResponse({ description: 'Rental bill created' })
  create(@Body() dto: CreateRentalBillDto, @CurrentUser() user: RequestUser) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rental bills' })
  @ApiQuery({ name: 'status', required: false, enum: RentalBillStatus })
  @ApiOkResponse({ description: 'Rental bill list' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: RentalBillStatus,
  ) {
    return this.service.findAll(user.userId, {
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rental bill detail' })
  @ApiOkResponse({ description: 'Rental bill detail' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update rental bill (status or information)' })
  @ApiOkResponse({ description: 'Rental bill updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRentalBillDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.update(id, user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete rental bill' })
  @ApiOkResponse({ description: 'Rental bill removed' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.userId);
  }
}
