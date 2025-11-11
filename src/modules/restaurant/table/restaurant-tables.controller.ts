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
import { RestaurantTablesService } from './restaurant-tables.service';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';

@ApiTags('restaurant-tables')
@Controller('restaurant/tables')
export class RestaurantTablesController {
  constructor(private readonly service: RestaurantTablesService) {}

  @Post()
  @ApiOperation({ summary: 'Create restaurant table' })
  @ApiCreatedResponse({ description: 'Restaurant table created' })
  create(@Body() dto: CreateRestaurantTableDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List restaurant tables' })
  @ApiQuery({ name: 'cooperationId', required: false, type: Number })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Restaurant table list' })
  findAll(
    @Query('cooperationId') cooperationId?: string,
    @Query('active') active?: string,
  ) {
    return this.service.findAll({
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant table detail' })
  @ApiOkResponse({ description: 'Restaurant table detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update restaurant table' })
  @ApiOkResponse({ description: 'Restaurant table updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantTableDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove restaurant table' })
  @ApiOkResponse({ description: 'Restaurant table removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
