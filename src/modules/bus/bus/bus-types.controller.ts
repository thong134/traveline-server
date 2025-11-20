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
import { BusTypesService } from './bus-types.service';
import { CreateBusTypeDto } from './dto/create-bus-type.dto';
import { UpdateBusTypeDto } from './dto/update-bus-type.dto';
import { RequireAuth } from '../../auth/decorators/require-auth.decorator';

@ApiTags('bus-types')
@Controller('bus/types')
export class BusTypesController {
  constructor(private readonly service: BusTypesService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Create bus type' })
  @ApiCreatedResponse({ description: 'Bus type created' })
  create(@Body() dto: CreateBusTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bus types' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiOkResponse({ description: 'Bus type list' })
  findAll(@Query('cooperationId') cooperationId?: string) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bus type detail' })
  @ApiOkResponse({ description: 'Bus type detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Update bus type' })
  @ApiOkResponse({ description: 'Bus type updated' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBusTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Remove bus type' })
  @ApiOkResponse({ description: 'Bus type removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
