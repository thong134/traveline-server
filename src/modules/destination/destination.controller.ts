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
import { UserRole } from '../user/entities/user-role.enum';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  @Post()
  @RequireAuth(UserRole.Admin)
  @ApiOperation({ summary: 'Tạo địa điểm du lịch' })
  @ApiCreatedResponse({ description: 'Destination created' })
  create(@Body() dto: CreateDestinationDto) {
    return this.destinationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Tìm kiếm địa điểm du lịch' })
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
    name: 'province',
    required: false,
    description: 'Lọc theo tỉnh/thành phố',
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
    @Query('province') province?: string,
  ) {
    return this.destinationsService.findAll({
      q,
      available:
        typeof available === 'string' ? available === 'true' : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      province,
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
  @ApiOperation({ summary: 'Chi tiết địa điểm theo ID' })
  @ApiOkResponse({ description: 'Destination detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.findOne(id);
  }


  @Patch(':id')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({ summary: 'Cập nhật địa điểm du lịch' })
  @ApiOkResponse({ description: 'Destination updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDestinationDto,
  ) {
    return this.destinationsService.update(id, dto);
  }

  @Delete(':id')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({ summary: 'Xóa địa điểm du lịch' })
  @ApiOkResponse({ description: 'Destination deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.remove(id);
  }
}
