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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DestinationsService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { RequireAuth } from '../auth/decorators/require-auth.decorator';
import { UserRole } from '../user/entities/user-role.enum';
import type { Express } from 'express';
import { DestinationEnrichmentService } from './destination-enrichment.service';
import { DestinationAutoDescriptionService } from './destination-auto-description.service';

@ApiTags('destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(
    private readonly destinationsService: DestinationsService,
    private readonly enrichmentService: DestinationEnrichmentService,
    private readonly autoDescService: DestinationAutoDescriptionService,
  ) {}

  // ===================== AUTO-FIX ENDPOINTS =====================

  @Get('auto-fix/preview')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary: 'Preview auto-fix for low quality descriptions (dry run)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max destinations to preview (default: 100)',
  })
  @ApiOkResponse({ description: 'Preview of auto-generated descriptions' })
  previewAutoFix(@Query('limit') limit?: string) {
    return this.autoDescService.autoFixLowQualityDescriptions(
      limit ? Number(limit) : 100,
      true, // dry run
    );
  }

  @Post('auto-fix/run')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary: 'Auto-fix low quality descriptions with templates (DESTRUCTIVE)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 100,
          description: 'Max destinations to process',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Auto-fix result' })
  runAutoFix(@Body() body: { limit?: number }) {
    return this.autoDescService.autoFixLowQualityDescriptions(
      body.limit ?? 100,
      false, // not dry run - will save changes
    );
  }

  @Post('auto-fix/all')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary: 'Process ALL low quality descriptions (use with caution)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        batchSize: {
          type: 'number',
          default: 100,
          description: 'Batch size for processing',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Full processing result' })
  processAllAutoFix(@Body() body: { batchSize?: number }) {
    return this.autoDescService.processAll(body.batchSize ?? 100);
  }

  // ===================== ENRICHMENT ENDPOINTS =====================

  @Get('enrich/stats')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary: 'Get enrichment statistics for destination descriptions',
  })
  @ApiOkResponse({ description: 'Statistics on description coverage' })
  getEnrichmentStats() {
    return this.enrichmentService.getEnrichmentStats();
  }

  @Get('enrich/export-csv')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary:
      'Export destinations needing translation to CSV (for Google Sheets)',
  })
  @ApiQuery({
    name: 'onlyNeedsTranslation',
    required: false,
    type: Boolean,
    description: 'Only export those needing English translation',
  })
  @ApiOkResponse({ description: 'CSV-ready data with quality flags' })
  async exportForTranslation(
    @Query('onlyNeedsTranslation') onlyNeedsTranslation?: string,
  ) {
    const needsTranslation = onlyNeedsTranslation === 'true';
    return this.enrichmentService.exportForTranslation(needsTranslation);
  }

  @Post('enrich/import-csv')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({ summary: 'Import translated descriptions from CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              descriptionViet: { type: 'string' },
              descriptionEng: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Import result' })
  importTranslations(
    @Body()
    body: {
      data: { id: number; descriptionViet?: string; descriptionEng?: string }[];
    },
  ) {
    return this.enrichmentService.importTranslations(body.data);
  }

  @Post('enrich/:id')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary: 'Generate AI descriptions for a single destination',
  })
  @ApiOkResponse({
    description: 'Enriched destination with bilingual descriptions',
  })
  enrichSingle(@Param('id', ParseIntPipe) id: number) {
    return this.enrichmentService.enrichDestination(id);
  }

  @Post('enrich/batch')
  @RequireAuth(UserRole.Admin)
  @ApiOperation({
    summary: 'Batch generate AI descriptions for multiple destinations',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 10,
          description: 'Max number to process',
        },
        onlyEmpty: {
          type: 'boolean',
          default: true,
          description: 'Only process empty descriptions',
        },
        delayMs: {
          type: 'number',
          default: 1000,
          description: 'Delay between API calls (ms)',
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Batch enrichment result' })
  enrichBatch(
    @Body() body: { limit?: number; onlyEmpty?: boolean; delayMs?: number },
  ) {
    return this.enrichmentService.batchEnrich(
      body.limit ?? 10,
      body.onlyEmpty ?? true,
      body.delayMs ?? 1000,
    );
  }

  // ===================== CRUD ENDPOINTS =====================

  @Post()
  @RequireAuth(UserRole.Admin)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photos', maxCount: 10 },
      { name: 'videos', maxCount: 5 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tạo địa điểm du lịch' })
  @ApiCreatedResponse({ description: 'Destination created' })
  create(
    @Body() dto: CreateDestinationDto,
    @UploadedFiles()
    files: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ) {
    return this.destinationsService.create(dto, files);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export destinations for AI model training (JSON format)',
  })
  @ApiOkResponse({
    description: 'All available destinations in AI-ready format',
  })
  async exportForAI() {
    return this.destinationsService.exportForAI();
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
    name: 'hasTourTickets',
    required: false,
    type: Boolean,
    description: 'Lọc địa điểm có vé tour',
  })
  @ApiQuery({
    name: 'cooperationId',
    required: false,
    type: Number,
    description: 'Lọc theo đối tác quản lý',
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
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['rating', 'popularity'],
    description: 'Sort by rating or popularity',
  })
  @ApiOkResponse({ description: 'Destination list' })
  findAll(
    @Query('q') q?: string,
    @Query('available') available?: string,
    @Query('hasTourTickets') hasTourTickets?: string,
    @Query('cooperationId') cooperationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('province') province?: string,
    @Query('sortBy') sortBy?: 'rating' | 'popularity',
  ) {
    return this.destinationsService.findAll({
      q,
      available:
        typeof available === 'string' ? available === 'true' : undefined,
      hasTourTickets:
        typeof hasTourTickets === 'string'
          ? hasTourTickets === 'true'
          : undefined,
      cooperationId: cooperationId ? Number(cooperationId) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      province,
      sortBy,
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

  @Get('recommend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đề xuất địa điểm phù hợp với sở thích người dùng (AI)',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Lọc theo tỉnh/thành phố',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng kết quả',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu',
  })
  @ApiOkResponse({ description: 'Danh sách địa điểm được đề xuất' })
  recommend(
    @CurrentUser() user: RequestUser,
    @Query('province') province?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.destinationsService.recommendForUser(
      user.userId,
      province,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }

  @Post('recommend/inspect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug AI Destination Scoring (Backend Proxy)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        province: { type: 'string' },
        limit: { type: 'number', default: 50 },
      },
    },
  })
  inspectRecommendation(
    @CurrentUser() user: RequestUser,
    @Body() body: { province?: string; limit?: number },
  ) {
    return this.destinationsService.inspectRecommendation(
      user.userId,
      body.province,
      body.limit,
    );
  }

  @Get('debug-score')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Debug Recommendation Score (GET convenience)' })
  @ApiQuery({
    name: 'province',
    required: false,
    type: String
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number
  })
  debugScore(
    @CurrentUser() user: RequestUser,
    @Query('province') province?: string,
    @Query('limit') limit?: string,
  ) {
    return this.destinationsService.inspectRecommendation(
      user.userId,
      province,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết địa điểm theo ID' })
  @ApiOkResponse({ description: 'Destination detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.destinationsService.findOne(id);
  }
  @Post(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Thêm địa điểm vào danh sách yêu thích' })
  async favorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    await this.destinationsService.favorite(id, user.userId);
    return { message: 'Added to favorites' };
  }

  @Delete(':id/favorite')
  @RequireAuth()
  @ApiOperation({ summary: 'Xóa địa điểm khỏi danh sách yêu thích' })
  async unfavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    await this.destinationsService.unfavorite(id, user.userId);
    return { message: 'Removed from favorites' };
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
