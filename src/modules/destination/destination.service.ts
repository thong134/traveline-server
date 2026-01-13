import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Destination } from './entities/destinations.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { User } from '../user/entities/user.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import type { Express } from 'express';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly repo: Repository<Destination>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateDestinationDto,
    files?: { photos?: Express.Multer.File[]; videos?: Express.Multer.File[] },
  ): Promise<Destination> {
    const photoUrls: string[] = [];
    const videoUrls: string[] = [];

    // 1. Upload Photos
    if (files?.photos && files.photos.length > 0) {
      const uploadPromises = files.photos.map((file) =>
        this.cloudinaryService.uploadImage(file, {
          folder: 'traveline/destinations/photos',
        }),
      );
      const results = await Promise.all(uploadPromises);
      photoUrls.push(...results.map((r) => r.url));
    } else {
      // User said photos is required
      throw new BadRequestException('At least one photo is required');
    }

    // 2. Upload Videos
    if (files?.videos && files.videos.length > 0) {
      const uploadPromises = files.videos.map((file) =>
        this.cloudinaryService.uploadVideo(file, {
          folder: 'traveline/destinations/videos',
        }),
      );
      const results = await Promise.all(uploadPromises);
      videoUrls.push(...results.map((r) => r.url));
    }

    // 3. Create Entity
    const destination = this.repo.create({
      ...dto,
      categories: dto.categories ?? [],
      photos: photoUrls,
      videos: videoUrls,
      available: true,
    });

    return this.repo.save(destination);
  }

  async findAll(params?: {
    q?: string;
    available?: boolean;
    limit?: number;
    offset?: number;
    province?: string;
    sortBy?: 'rating' | 'popularity';
    hasTourTickets?: boolean;
    cooperationId?: number;
  }): Promise<Destination[]> {
    const {
      q,
      available,
      limit = 50,
      offset = 0,
      province,
      sortBy,
    } = params || {};
    const qb = this.repo.createQueryBuilder('destination');

    if (q) {
      qb.andWhere(
        `(
          destination.name ILIKE :q
          OR destination.province ILIKE :q
        )`,
        { q: `%${q}%` },
      );
    }
    if (province) {
      qb.andWhere('destination.province = :province', { province });
    }
    if (typeof available === 'boolean') {
      qb.andWhere('destination.available = :available', { available });
    }
    if (typeof params?.hasTourTickets === 'boolean') {
      qb.andWhere('destination.has_tour_tickets = :hasTourTickets', {
        hasTourTickets: params.hasTourTickets,
      });
    }
    if (params?.cooperationId) {
      qb.andWhere('destination.cooperation_id = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }

    if (sortBy === 'rating') {
      qb.orderBy('destination.rating', 'DESC');
    } else if (sortBy === 'popularity') {
      qb.orderBy('destination.favouriteTimes', 'DESC');
    } else {
      qb.orderBy('destination.createdAt', 'DESC');
    }

    qb.take(limit).skip(offset);
    return qb.getMany();
  }

  /**
   * Export all available destinations in a format suitable for AI model training.
   * Returns: Array of destinations with fields mapped for AI consumption.
   */
  async exportForAI(): Promise<object[]> {
    const destinations = await this.repo.find({
      where: { available: true },
      order: { id: 'ASC' },
    });

    return destinations.map((dest) => ({
      destinationId: dest.id,
      name: dest.name,
      province: dest.province || '',
      category: dest.categories?.length > 0 ? dest.categories[0] : 'Unknown',
      averageRating: dest.rating || 0,
      favouriteTimes: dest.favouriteTimes || 0,
      latitude: dest.latitude,
      longitude: dest.longitude,
      description:
        dest.descriptionViet ||
        dest.descriptionEng ||
        `Địa điểm du lịch tại ${dest.province || 'Việt Nam'}`,
      categories: dest.categories || [],
      district: dest.district || '',
      openTime: dest.openTime || '',
      closeTime: dest.closeTime || '',
    }));
  }

  async findOne(id: number): Promise<Destination> {
    const destination = await this.repo.findOne({ where: { id } });
    if (!destination)
      throw new NotFoundException(`Địa điểm #${id} không tồn tại`);
    return destination;
  }

  async update(id: number, dto: UpdateDestinationDto): Promise<Destination> {
    const destination = await this.findOne(id);
    const { categories, photos, videos, ...rest } = dto;

    const destinationRecord = destination as unknown as Record<string, unknown>;

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        destinationRecord[key] = value;
      }
    }

    if (categories !== undefined) {
      destination.categories = categories;
    }
    if (videos !== undefined) {
      destination.videos = videos;
    }

    return this.repo.save(destination);
  }

  async remove(id: number): Promise<{ message: string; id: number }> {
    const destination = await this.findOne(id);
    await this.repo.remove(destination);
    return { message: 'Đã xoá địa điểm', id };
  }

  async findFavoritesByUser(userId: number): Promise<Destination[]> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.favoriteDestinationIds?.length) {
      return [];
    }

    const ids = user.favoriteDestinationIds
      .map((rawId) => Number(rawId))
      .filter((value) => Number.isInteger(value));

    if (!ids.length) {
      return [];
    }

    const destinations = await this.repo.find({ where: { id: In(ids) } });
    const order = new Map(ids.map((value, index) => [value, index]));
    return destinations.sort((a, b) => {
      const left = order.get(a.id) ?? 0;
      const right = order.get(b.id) ?? 0;
      return left - right;
    });
  }

  async favorite(destinationId: number, userId: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    const destination = await this.repo.findOne({
      where: { id: destinationId },
    });
    if (!destination) {
      throw new NotFoundException(`Destination ${destinationId} not found`);
    }

    const current = user.favoriteDestinationIds ?? [];
    if (!current.includes(destinationId.toString())) {
      user.favoriteDestinationIds = [...current, destinationId.toString()];
      await this.usersRepo.save(user);

      // Increment counter
      destination.favouriteTimes = (destination.favouriteTimes || 0) + 1;
      await this.repo.save(destination);
      
      // Proactive sync to AI
      this.syncToAI().catch(e => console.error('Auto-sync to AI failed:', e.message));
    }
  }

  async unfavorite(destinationId: number, userId: number): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const current = user.favoriteDestinationIds ?? [];
    if (current.includes(destinationId.toString())) {
      user.favoriteDestinationIds = current.filter(
        (id) => id !== destinationId.toString(),
      );
      await this.usersRepo.save(user);

      // Decrement counter
      const destination = await this.repo.findOne({ where: { id: destinationId } });
      if (destination && destination.favouriteTimes > 0) {
        destination.favouriteTimes -= 1;
        await this.repo.save(destination);
      }

      this.syncToAI().catch(e => console.error('Auto-sync to AI failed:', e.message));
    }
  }

  /**
   * Syncs database destinations to AI model service and triggers reload.
   */
  async syncToAI(): Promise<void> {
    const data = await this.exportForAI();
    const csvHeader = 'destinationId,name,province,category,averageRating,favouriteTimes,latitude,longitude,description,categories,district,openTime,closeTime\n';
    
    // Simple CSV row formatter
    const csvRows = data.map((d: any) => {
      const escape = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val);
        return `"${str.replace(/"/g, '""')}"`;
      };

      const formatList = (list: string[]) => {
        if (!list || list.length === 0) return '"[]"';
        // Python expected format: ['Cat1', 'Cat2']
        return `"[${list.map(v => `'${v.replace(/'/g, "\\'")}'`).join(', ')}]"`;
      };

      return [
        d.destinationId,
        escape(d.name),
        escape(d.province),
        escape(d.category),
        d.averageRating,
        d.favouriteTimes,
        d.latitude,
        d.longitude,
        escape(d.description),
        formatList(d.categories),
        escape(d.district),
        escape(d.openTime),
        escape(d.closeTime)
      ].join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');
    
    // Trigger reload in AI Service
    const aiUrl = this.configService.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';
    
    // Path to AI service data directory - only used in local development
    const aiDataPath = this.configService.get<string>('AI_DATA_PATH') || 'd:/ai-model-service/data/destinations.csv';
    
    // Only attempt to write CSV locally if we're not on Vercel and the path exists
    if (!process.env.VERCEL) {
      const fs = require('fs');
      try {
        if (fs.existsSync(require('path').dirname(aiDataPath))) {
          fs.writeFileSync(aiDataPath, csvContent);
          console.log(`✓ CSV exported locally to: ${aiDataPath}`);
        }
      } catch (e) {
        console.warn('Local CSV sync skipped:', e.message);
      }
    }
    
    try {
      await firstValueFrom(this.httpService.post(`${aiUrl}/reload`, {}));
      console.log('✓ AI Model reload triggered');
    } catch (e) {
      console.error('Failed to trigger AI reload:', e.message);
    }
  }

  // Hobby to Category mapping
  private readonly hobbyToCategoryMap: Record<string, string[]> = {
    Adventure: ['Thiên nhiên'],
    Relaxation: ['Thiên nhiên', 'Giải trí'],
    'Culture&History': ['Công trình', 'Văn hóa', 'Lịch sử'],
    Entertainment: ['Giải trí'],
    Nature: ['Thiên nhiên'],
    'Beach&Islands': ['Biển'],
    'Mountain&Forest': ['Núi'],
    Photography: ['Thiên nhiên', 'Công trình'],
    'Foods&Drinks': ['Công trình', 'Văn hóa'],
  };

  async recommendForUser(
    userId: number,
    province?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Destination[]> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: [
        'travelRoutes',
        'travelRoutes.stops',
        'travelRoutes.stops.destination',
        'feedbacks',
        'feedbacks.destination',
      ],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // 1. Build Behavioral Profiles
    const historyProfile: Record<string, number> = {};
    const engagementProfile: Record<string, number> = {};

    // Analyze History (TravelRoutes & Stops)
    for (const route of user.travelRoutes || []) {
      for (const stop of route.stops || []) {
        if (stop.destination?.categories) {
          for (const cat of stop.destination.categories) {
            historyProfile[cat] = (historyProfile[cat] || 0) + 1;
          }
        }
      }
    }

    // Analyze Engagement (Feedbacks)
    for (const feedback of user.feedbacks || []) {
      if (feedback.destination?.categories) {
        for (const cat of feedback.destination.categories) {
          engagementProfile[cat] = (engagementProfile[cat] || 0) + 1;
        }
      }
    }

    // Analyze Favorites (NEW: Favorites should influence the profile)
    if (user.favoriteDestinationIds?.length) {
      const favorites = await this.repo.find({
        where: { id: In(user.favoriteDestinationIds.map(id => Number(id))) }
      });
      for (const dest of favorites) {
        if (dest.categories) {
          for (const cat of dest.categories) {
            // Hearting is a strong signal, maybe count it twice?
            historyProfile[cat] = (historyProfile[cat] || 0) + 2;
          }
        }
      }
    }

    // 2. Call AI Service for Hybrid Ranking
    const aiUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';

    try {
      const payload = {
        hobbies: user.hobbies || [],
        favorites: user.favoriteDestinationIds || [],
        history_profile: historyProfile,
        engagement_profile: engagementProfile,
        province,
        limit,
        offset,
      };

      const { data } = await firstValueFrom(
        this.httpService.post(`${aiUrl}/recommend/destinations`, payload),
      );

      // 3. Map AI IDs back to Entities
      if (Array.isArray(data) && data.length > 0) {
        const ids = data.map((item: any) => Number(item.destinationId));
        const destinations = await this.repo.find({ where: { id: In(ids) } });
        // Restore order from AI ranking
        const orderMap = new Map(ids.map((id, index) => [id, index]));
        return destinations.sort(
          (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
        );
      }
    } catch (e) {
      console.error(
        'AI Recommendation failed, falling back to basic scoring:',
        e.message,
      );
    }

    // Fallback to basic scoring if AI is down (kept for robustness)
    const targetCategories = new Set<string>();
    for (const hobby of user.hobbies || []) {
      const mapped = this.hobbyToCategoryMap[hobby] || [];
      mapped.forEach((cat) => targetCategories.add(cat));
    }

    const qb = this.repo.createQueryBuilder('destination');
    qb.where('destination.available = :available', { available: true });
    if (province)
      qb.andWhere('destination.province ILIKE :province', {
        province: `%${province}%`,
      });
    const allDestinations = await qb.getMany();

    const scored = allDestinations.map((dest) => {
      let score = 0;
      const categoryMatch = (dest.categories || []).some((cat) =>
        targetCategories.has(cat),
      );
      if (categoryMatch) score += 0.5;
      const maxFav = Math.max(
        ...allDestinations.map((d) => d.favouriteTimes || 0),
        1,
      );
      score += 0.3 * ((dest.favouriteTimes || 0) / maxFav);
      score += 0.2 * ((dest.rating || 0) / 5);
      if (user.favoriteDestinationIds?.includes(dest.id.toString()))
        score += 0.1;
      return { destination: dest, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(offset, offset + limit).map((s) => s.destination);
  }

  async inspectRecommendation(
    userId: number,
    province?: string,
    limit: number = 50,
  ) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: [
        'travelRoutes',
        'travelRoutes.stops',
        'travelRoutes.stops.destination',
        'feedbacks',
        'feedbacks.destination',
      ],
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const historyProfile: Record<string, number> = {};
    const engagementProfile: Record<string, number> = {};

    for (const route of user.travelRoutes || []) {
      for (const stop of route.stops || []) {
        if (stop.destination?.categories) {
          for (const cat of stop.destination.categories) {
            historyProfile[cat] = (historyProfile[cat] || 0) + 1;
          }
        }
      }
    }

    for (const feedback of user.feedbacks || []) {
      if (feedback.destination?.categories) {
        for (const cat of feedback.destination.categories) {
          engagementProfile[cat] = (engagementProfile[cat] || 0) + 1;
        }
      }
    }

    // Analyze Favorites
    if (user.favoriteDestinationIds?.length) {
      const favorites = await this.repo.find({
        where: { id: In(user.favoriteDestinationIds.map(id => Number(id))) }
      });
      for (const dest of favorites) {
        if (dest.categories) {
          for (const cat of dest.categories) {
            historyProfile[cat] = (historyProfile[cat] || 0) + 2;
          }
        }
      }
    }

    const aiUrl =
      this.configService.get<string>('AI_SERVICE_URL') ??
      'http://localhost:8000';

    const payload = {
      hobbies: user.hobbies || [],
      favorites: user.favoriteDestinationIds || [],
      history_profile: historyProfile,
      engagement_profile: engagementProfile,
      province,
      limit,
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${aiUrl}/recommend/destinations/inspect`,
          payload,
        ),
      );
      return data;
    } catch (error) {
      return {
        error: 'Failed to call AI service',
        details: error.response?.data || error.message,
      };
    }
  }
}
