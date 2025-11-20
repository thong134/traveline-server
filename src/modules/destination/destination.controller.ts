import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DestinationsService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { UpdateFavoriteDestinationsDto } from './dto/update-favorite-destinations.dto';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Post()
  @RequireAuth()
  @ApiOperation({ summary: 'Create a destination' })
  @ApiCreatedResponse({ description: 'Destination created' })
  create(@Body() dto: CreateDestinationDto) {
    return this.destinationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Search destinations' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search keyword by name or type',
  })
  @ApiQuery({
    name: 'available',
    required: false,
    description: 'Filter by availability (true/false)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Limit number of items',
    type: Number,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Paginate starting index',
    type: Number,
  })
  @ApiOkResponse({ description: 'Destination list' })
  findAll(
    @Query('q') q?: string,
    @Query('available') available?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.destinationsService.findAll({
      q,
      available:
        typeof available === 'string' ? available === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Danh sách địa điểm yêu thích của người dùng hiện tại',
  })
  @ApiOkResponse({ description: 'Danh sách địa điểm được yêu thích' })
  findFavorites(@CurrentUser() user: RequestUser) {
    return this.destinationsService.findFavoritesByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a destination by id' })
  @ApiOkResponse({ description: 'Destination detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.findOne(id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Thêm địa điểm vào danh sách yêu thích của người dùng',
  })
  @ApiOkResponse({
    description: 'Địa điểm sau khi được cập nhật lượt yêu thích',
  })
  favoriteDestination(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.destinationsService.favoriteDestination(user.userId, id);
  }

  @Patch('favorites')
  @RequireAuth()
  @ApiOperation({
    summary: 'Cập nhật danh sách địa điểm yêu thích của người dùng',
  })
  @ApiOkResponse({
    description: 'Danh sách địa điểm yêu thích sau khi cập nhật',
  })
  updateFavorites(
    @Body() dto: UpdateFavoriteDestinationsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.destinationsService.updateFavoriteDestinations(
      user.userId,
      dto.destinationIds,
    );
  }

  @Patch(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Update destination' })
  @ApiOkResponse({ description: 'Destination updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDestinationDto,
  ) {
    return this.destinationsService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth()
  @ApiOperation({ summary: 'Delete destination' })
  @ApiOkResponse({ description: 'Destination deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.remove(id);
  }
}
