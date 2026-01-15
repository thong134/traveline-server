import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { MapService } from '../../../common/map/map.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Cooperation } from '../../cooperation/entities/cooperation.entity';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { CreateRestaurantTableDto } from './dto/create-restaurant-table.dto';
import { UpdateRestaurantTableDto } from './dto/update-restaurant-table.dto';
import { CooperationStatus } from '../../cooperation/entities/cooperation-enums';
import { User } from '../../user/entities/user.entity';
import { calculateDistance } from '../../../common/utils/location.util';
import { assignDefined } from '../../../common/utils/object.util';

@Injectable()
export class RestaurantTablesService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mapService: MapService,
  ) {}

  private readonly logger = new Logger(RestaurantTablesService.name);

  private async ensureCooperation(id: number): Promise<Cooperation> {
    const cooperation = await this.cooperationRepo.findOne({ where: { id } });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${id} not found`);
    }
    if (cooperation.type !== 'restaurant') {
      throw new BadRequestException(
        'Cooperation must be of type restaurant to manage tables',
      );
    }
    return cooperation;
  }

  async create(dto: CreateRestaurantTableDto): Promise<RestaurantTable> {
    const cooperation = await this.ensureCooperation(dto.cooperationId);
    const table = this.tableRepo.create({
      cooperation,
      name: dto.name,
      quantity: dto.quantity ?? 1,
      dishType: dto.dishType,
      priceRange: dto.priceRange,
      maxPeople: dto.maxPeople,
      photo: dto.photo,
      note: dto.note,
      active: dto.active ?? true,
    });
    return this.tableRepo.save(table);
  }

  async findAll(
    params: {
      cooperationId?: number;
      active?: boolean;
      provinceId?: string;
      districtId?: string;
    } = {},
  ): Promise<RestaurantTable[]> {
    const qb = this.tableRepo
      .createQueryBuilder('table')
      .leftJoinAndSelect('table.cooperation', 'cooperation');

    if (params.cooperationId) {
      qb.andWhere('table.cooperation_id = :cooperationId', {
        cooperationId: params.cooperationId,
      });
    }
    if (params.provinceId) {
      qb.andWhere('cooperation.provinceId = :provinceId', {
        provinceId: params.provinceId,
      });
    }
    if (params.districtId) {
      qb.andWhere('cooperation.districtId = :districtId', {
        districtId: params.districtId,
      });
    }
    if (typeof params.active === 'boolean') {
      qb.andWhere('table.active = :active', { active: params.active });
    }
    return qb.orderBy('table.createdAt', 'DESC').getMany();
  }

  async findOne(id: number): Promise<RestaurantTable> {
    const table = await this.tableRepo.findOne({
      where: { id },
      relations: { cooperation: true },
    });
    if (!table) {
      throw new NotFoundException(`Restaurant table ${id} not found`);
    }
    return table;
  }

  async update(
    id: number,
    dto: UpdateRestaurantTableDto,
  ): Promise<RestaurantTable> {
    const table = await this.findOne(id);
    if (dto.cooperationId !== undefined) {
      table.cooperation = await this.ensureCooperation(dto.cooperationId);
    }
    assignDefined(table, {
      name: dto.name,
      quantity: dto.quantity,
      dishType: dto.dishType,
      priceRange: dto.priceRange,
      maxPeople: dto.maxPeople,
      photo: dto.photo,
      note: dto.note,
    });
    if (dto.active !== undefined) {
      table.active = dto.active;
    }
    return this.tableRepo.save(table);
  }

  async remove(id: number): Promise<{ id: number; message: string }> {
    const table = await this.findOne(id);
    await this.tableRepo.remove(table);
    return { id, message: 'Restaurant table removed' };
  }

  // --- SEEDER LOGIC ---
  async seedRestaurants() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    const partners = [
      {
        name: 'Golden Gate Restaurant',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/goldengate_logo',
        representativeName: 'GG Group',
        province: 'Hồ Chí Minh',
        latitude: 10.7769,
        longitude: 106.7009,
      },
      {
        name: 'Wrap & Roll',
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/wraproll_logo',
        representativeName: 'WR Group',
        province: 'Hà Nội',
      },
      {
        name: "Pizza 4P's",
        brandLogo:
          'https://res.cloudinary.com/traveline/image/upload/v1/pizza4ps_logo',
        representativeName: "4P's Group",
        province: 'Hồ Chí Minh',
      },
    ];

    for (const p of partners) {
      let coop = await this.cooperationRepo.findOne({
        where: { name: ILike(p.name) },
      });
      if (!coop) {
        coop = this.cooperationRepo.create({
          ...p,
          type: 'restaurant',
          status: CooperationStatus.ACTIVE,
          manager: admin || undefined,
          revenue: '0',
          averageRating: '4.8',
          bookingTimes: 0,
        });
        await this.cooperationRepo.save(coop);
      }

      // Seed Tables
      const count = await this.tableRepo.count({
        where: { cooperation: { id: coop.id } },
      });
      if (count === 0) {
        await this.tableRepo.save([
          this.tableRepo.create({
            name: 'Bàn 2 người Standard',
            maxPeople: 2,
            quantity: 10,
            dishType: 'Tổng hợp',
            priceRange: '200k - 500k',
            cooperation: coop,
            active: true,
          }),
          this.tableRepo.create({
            name: 'Bàn 4 người VIP',
            maxPeople: 4,
            quantity: 5,
            dishType: 'Hải sản',
            priceRange: '1tr - 2tr',
            cooperation: coop,
            active: true,
          }),
        ]);
      }
    }
    return { message: 'Restaurants and tables seeded successfully' };
  }

  // --- SEARCH RESTAURANTS WITH MOCK TABLES ---
  async searchRestaurants(query: {
    latitude?: number;
    longitude?: number;
    reservationTime?: string;
    guests?: number;
    dishType?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const qb = this.cooperationRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.restaurantTables', 'tables')
      .where({ type: ILike('restaurant') })
      .andWhere('coop.latitude IS NOT NULL')
      .andWhere('coop.longitude IS NOT NULL')
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    this.logger.log(`Searching restaurants with query: ${JSON.stringify(query)}`);
    let restaurants = await qb.getMany();
    this.logger.log(`Found ${restaurants.length} restaurants from DB before filtering.`);

    // Distance filtering
    if (query.latitude && query.longitude) {
      // 1. Pre-filter using Haversine (lightweight)
      const PRE_FILTER_RADIUS = 50; // 50km buffer
      const candidateRestaurants = restaurants.filter((r) => {
        if (!r.latitude || !r.longitude) {
           this.logger.warn(`Restaurant ${r.name} (ID: ${r.id}) is missing coordinates.`);
           return false;
        }
        const haversineDist = calculateDistance(
          query.latitude!,
          query.longitude!,
          Number(r.latitude),
          Number(r.longitude),
        );
        return haversineDist <= PRE_FILTER_RADIUS;
      });

      this.logger.log(`Pre-filtered ${candidateRestaurants.length}/${restaurants.length} restaurants within ${PRE_FILTER_RADIUS}km (Haversine).`);

      // 2. Accurate filtering using OSRM (heavy)
      const restaurantsWithDistance = await Promise.all(
        candidateRestaurants.map(async (r) => {
          try {
            const dist = await this.mapService.getDistance(
              query.latitude!,
              query.longitude!,
              Number(r.latitude),
              Number(r.longitude),
            );
            (r as any).distance = dist;
            this.logger.log(`Restaurant ${r.name}: Lat=${r.latitude}, Long=${r.longitude}, Distance=${dist}km`);
            
            if (dist > 15) { // 15km radius for restaurants
               this.logger.log(`Restaurant ${r.name} excluded due to OSRM distance > 15km`);
            }

            return dist <= 15 ? r : null;
          } catch (error) {
             this.logger.error(`Failed to calculate distance for restaurant ${r.name}`, error);
             return null;
          }
        }),
      );
      
      restaurants = restaurantsWithDistance.filter((r) => r !== null) as Cooperation[];
      restaurants.sort((a, b) => (a as any).distance - (b as any).distance);
      this.logger.log(`After OSRM distance filter: ${restaurants.length} restaurants.`);
    }

    return restaurants
      .map((rest) => {
        let filteredTables = rest.restaurantTables || [];

        if (query.guests) {
          filteredTables = filteredTables.filter(
            (t) => (t.maxPeople || 0) >= query.guests!,
          );
        }
        if (query.dishType) {
          filteredTables = filteredTables.filter((t) =>
            t.dishType?.toLowerCase().includes(query.dishType!.toLowerCase()),
          );
        }

        // Mock availability
        const tablesWithMock = filteredTables.map((table) => ({
          ...table,
          availableQuantity: Math.floor(Math.random() * table.quantity) + 1,
          isAvailable: Math.random() > 0.15,
        }));

        return {
          ...rest,
          restaurantTables: tablesWithMock,
        };
      })
      .filter((rest) => rest.restaurantTables.length > 0);
  }
}
