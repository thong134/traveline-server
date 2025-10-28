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
import { CooperationsService } from './cooperations.service';
import { CreateCooperationDto } from './dto/create-cooperation.dto';
import { UpdateCooperationDto } from './dto/update-cooperation.dto';

@ApiTags('cooperations')
@Controller('cooperations')
export class CooperationsController {
  constructor(private readonly cooperationsService: CooperationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cooperation partner' })
  @ApiCreatedResponse({ description: 'Cooperation created' })
  create(@Body() dto: CreateCooperationDto) {
    return this.cooperationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cooperation partners' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Cooperation list' })
  findAll(
    @Query('type') type?: string,
    @Query('city') city?: string,
    @Query('province') province?: string,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.cooperationsService.findAll({ type, city, province, active });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cooperation detail' })
  @ApiOkResponse({ description: 'Cooperation detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cooperationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cooperation information' })
  @ApiOkResponse({ description: 'Cooperation updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCooperationDto,
  ) {
    return this.cooperationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cooperation' })
  @ApiOkResponse({ description: 'Cooperation removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cooperationsService.remove(id);
  }
}
