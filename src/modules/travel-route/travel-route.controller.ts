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
import { TravelRoutesService } from './travel-route.service';
import { CreateTravelRouteDto } from './dto/create-travel-route.dto';
import { UpdateTravelRouteDto } from './dto/update-travel-route.dto';

@ApiTags('travel-routes')
@Controller('travel-routes')
export class TravelRoutesController {
  constructor(private readonly travelRoutesService: TravelRoutesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a travel route with optional stops' })
  @ApiCreatedResponse({ description: 'Travel route created' })
  create(@Body() dto: CreateTravelRouteDto) {
    return this.travelRoutesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List travel routes' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by route name' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by owner user id',
    type: Number,
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Filter by province',
  })
  @ApiOkResponse({ description: 'Travel route list' })
  findAll(
    @Query('q') q?: string,
    @Query('province') province?: string,
    @Query('userId') userId?: string,
  ) {
    return this.travelRoutesService.findAll({
      q,
      province,
      userId: userId ? Number(userId) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get travel route details' })
  @ApiOkResponse({ description: 'Travel route detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.travelRoutesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a travel route' })
  @ApiOkResponse({ description: 'Travel route updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTravelRouteDto,
  ) {
    return this.travelRoutesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a travel route' })
  @ApiOkResponse({ description: 'Travel route removed' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.travelRoutesService.remove(id);
  }
}
