import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { calculateDistance } from '../../common/utils/location.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Cooperation } from '../cooperation/entities/cooperation.entity';
import { HotelRoom } from '../hotel/room/entities/hotel-room.entity';
import { RestaurantTable } from '../restaurant/table/entities/restaurant-table.entity';
import { DeliveryVehicle } from '../delivery/delivery-vehicle/entities/delivery-vehicle.entity';
import { BusType } from '../bus/bus/entities/bus-type.entity';
import { TrainRoute } from '../train/train/entities/train-route.entity';
import { Flight } from '../flight/flight/entities/flight.entity';
import { Destination } from '../destination/entities/destinations.entity';
import { CooperationStatus } from '../cooperation/entities/cooperation-enums';
import { User } from '../user/entities/user.entity';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Cooperation)
    private readonly coopRepo: Repository<Cooperation>,
    @InjectRepository(HotelRoom)
    private readonly roomRepo: Repository<HotelRoom>,
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(DeliveryVehicle)
    private readonly vehicleRepo: Repository<DeliveryVehicle>,
    @InjectRepository(BusType)
    private readonly busTypeRepo: Repository<BusType>,
    @InjectRepository(TrainRoute)
    private readonly trainRouteRepo: Repository<TrainRoute>,
    @InjectRepository(Flight) private readonly flightRepo: Repository<Flight>,
    @InjectRepository(Destination)
    private readonly destRepo: Repository<Destination>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async seedPartners() {
    let admin = await this.userRepo.findOne({ where: { id: 1 } });
    if (!admin) {
      admin = this.userRepo.create({
        fullName: 'Admin',
        username: 'admin',
        password: 'hashed_password', // Should be properly hashed in reality
        email: 'admin@traveline.vn',
      });
      admin = await this.userRepo.save(admin);
    }

    const partners = [
      // Hotels
      {
        name: 'Khách sạn Hà Nội Daewoo',
        type: 'hotel',
        brandLogo: 'https://firebasestorage.googleapis.com/v0/b/tour-guide-app-50140.appspot.com/o/places_photos%2FC00001_0.jpg?alt=media&token=74d00636-f7e8-4355-9fa7-4718fc7ddd69',
        representativeName: 'Daewoo Group',
        province: 'Hà Nội', district: 'Ba Đình',
        provinceId: '01', districtId: '001',
        address: '360 Kim Mã, Ngọc Khánh, Ba Đình, Hà Nội',
        latitude: 21.0307546, longitude: 105.8120637,
        introduction: 'Khách sạn trang nhã, phòng ở thoáng mát, nhiều nhà hàng, quán bar sôi động và bể bơi ngoài trời.',
      },
      {
        name: 'Vinpearl Hotels',
        type: 'hotel',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/vinpearl_logo',
        representativeName: 'Vingroup',
        province: 'Hồ Chí Minh', district: 'Quận 1',
        provinceId: '79', districtId: '760',
        latitude: 10.7769, longitude: 106.7009,
      },
      {
        name: 'Fusion Hotels',
        type: 'hotel',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/fusion_logo',
        representativeName: 'Fusion Group',
        province: 'Hà Nội', district: 'Hoàn Kiếm',
        provinceId: '01', districtId: '001',
      },
      // Restaurants
      {
        name: 'Golden Gate Restaurant',
        type: 'restaurant',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/goldengate_logo',
        representativeName: 'GG Group',
        province: 'Hồ Chí Minh', district: 'Quận 1',
        provinceId: '79', districtId: '760',
      },
      {
        name: 'Wrap & Roll',
        type: 'restaurant',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/wraproll_logo',
        representativeName: 'WR Group',
        province: 'Hà Nội', district: 'Hoàn Kiếm',
        provinceId: '01', districtId: '001',
      },
      {
        name: "Pizza 4P's",
        type: 'restaurant',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/pizza4ps_logo',
        representativeName: "4P's Group",
        province: 'Hồ Chí Minh', district: 'Quận 1',
        provinceId: '79', districtId: '760',
      },
      // Bus
      {
        name: 'Phương Trang (FUTA Bus)',
        type: 'bus',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/futa_logo',
        representativeName: 'Nguyễn Văn A',
        province: 'Hồ Chí Minh', district: 'Quận 10',
        provinceId: '79', districtId: '771',
      },
      {
        name: 'Mai Linh Express',
        type: 'bus',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/mailinh_logo',
        representativeName: 'Trần Văn B',
        province: 'Hồ Chí Minh', district: 'Quận 10',
        provinceId: '79', districtId: '771',
      },
      {
        name: 'Thành Bưởi',
        type: 'bus',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/thanhbuoi_logo',
        representativeName: 'Lê Văn C',
        province: 'Lâm Đồng', district: 'Thành phố Đà Lạt',
        provinceId: '68', districtId: '672',
      },
      // Train
      {
        name: 'Đường sắt Việt Nam (DSVN)',
        type: 'train',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/dsvn_logo',
        representativeName: 'Tổng Công Ty DSVN',
        province: 'Hà Nội', district: 'Đống Đa',
        provinceId: '01', districtId: '006',
      },
      // Flights
      {
        name: 'Vietnam Airlines',
        type: 'flight',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/vna_logo',
        representativeName: 'VNA Group',
        province: 'Hà Nội', district: 'Long Biên',
        provinceId: '01', districtId: '004',
      },
      {
        name: 'VietJet Air',
        type: 'flight',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/vietjet_logo',
        representativeName: 'VJC Group',
        province: 'Hồ Chí Minh', district: 'Tân Bình',
        provinceId: '79', districtId: '766',
      },
      {
        name: 'Bamboo Airways',
        type: 'flight',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/bamboo_logo',
        representativeName: 'Bamboo Group',
        province: 'Hà Nội', district: 'Cầu Giấy',
        provinceId: '01', districtId: '005',
      },
      // Delivery
      {
        name: 'Giao Hàng Nhanh (GHN)',
        type: 'delivery',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/ghn_logo',
        representativeName: 'GHN Logistics',
        province: 'Hồ Chí Minh', district: 'Quận 7',
        provinceId: '79', districtId: '778',
      },
      {
        name: 'Lalamove',
        type: 'delivery',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/lalamove_logo',
        representativeName: 'Lalamove VN',
        province: 'Hồ Chí Minh', district: 'Quận 1',
        provinceId: '79', districtId: '760',
      },
      {
        name: 'Viettel Post',
        type: 'delivery',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/viettelpost_logo',
        representativeName: 'Viettel',
        province: 'Hà Nội', district: 'Nam Từ Liêm',
        provinceId: '01', districtId: '009',
      },
      // Tour
      {
        name: 'Saigontourist',
        type: 'tour',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/saigontourist_logo',
        representativeName: 'SGT Group',
        province: 'Hồ Chí Minh', district: 'Quận 1',
        provinceId: '79', districtId: '760',
      },
      {
        name: 'Vietravel',
        type: 'tour',
        brandLogo: 'https://res.cloudinary.com/traveline/image/upload/v1/vietravel_logo',
        representativeName: 'Vietravel Group',
        province: 'Hồ Chí Minh', district: 'Quận 3',
        provinceId: '79', districtId: '770',
      },
    ];

    for (const p of partners) {
      let coop = await this.coopRepo.findOne({
        where: { name: ILike(p.name) },
      });
      if (!coop) {
        this.logger.log(`Creating new partner: ${p.name}`);
        coop = this.coopRepo.create({
          name: p.name,
          type: p.type,
          brandLogo: p.brandLogo,
          representativeName: p.representativeName,
          province: (p as any).province,
          district: (p as any).district,
          provinceId: (p as any).provinceId,
          districtId: (p as any).districtId,
          address: (p as any).address,
          latitude: (p as any).latitude,
          longitude: (p as any).longitude,
          introduction: (p as any).introduction,
          status: CooperationStatus.ACTIVE,
          manager: admin,
          revenue: '0',
          averageRating: '4.5',
          bookingTimes: 0,
        });
        await this.coopRepo.save(coop);
      } else {
        this.logger.log(`Updating existing partner: ${p.name} (ID: ${coop.id})`);
        // Update existing with location if missing or provided
        if ((p as any).province) coop.province = (p as any).province;
        if ((p as any).district) coop.district = (p as any).district;
        if ((p as any).provinceId) coop.provinceId = (p as any).provinceId;
        if ((p as any).districtId) coop.districtId = (p as any).districtId;
        if ((p as any).address) coop.address = (p as any).address;
        if ((p as any).latitude) coop.latitude = (p as any).latitude;
        if ((p as any).longitude) coop.longitude = (p as any).longitude;
        if ((p as any).introduction)
          coop.introduction = (p as any).introduction;

        await this.coopRepo.save(coop);
      }
    }
    return { message: 'Famous partners seeded successfully' };
  }

  async seedServiceData() {
    const cooperations = await this.coopRepo.find();

    for (const coop of cooperations) {
      if (coop.type === 'hotel') {
        const count = await this.roomRepo.count({
          where: { cooperation: { id: coop.id } },
        });
        if (count === 0) {
          await this.roomRepo.save([
            this.roomRepo.create({
              name: 'Phòng Deluxe Double',
              price: '1200000',
              maxPeople: 2,
              numberOfRooms: 10,
              cooperation: coop,
              amenities: ['Wifi', 'AC'],
              status: 'active',
            }),
            this.roomRepo.create({
              name: 'Phòng Suite King',
              price: '2500000',
              maxPeople: 2,
              numberOfRooms: 5,
              cooperation: coop,
              amenities: ['Wifi', 'AC', 'Bathtub'],
              status: 'active',
            }),
            this.roomRepo.create({
              name: 'Phòng Gia đình Executive',
              price: '4500000',
              maxPeople: 4,
              numberOfRooms: 3,
              cooperation: coop,
              amenities: ['Wifi', 'AC', 'Living Room'],
              status: 'active',
            }),
          ]);
        }
      } else if (coop.type === 'restaurant') {
        const count = await this.tableRepo.count({
          where: { cooperation: { id: coop.id } },
        });
        if (count === 0) {
          await this.tableRepo.save([
            this.tableRepo.create({
              name: 'Bàn 2 người',
              maxPeople: 2,
              quantity: 20,
              dishType: 'Á - Âu',
              priceRange: '200k - 500k',
              cooperation: coop,
              active: true,
            }),
            this.tableRepo.create({
              name: 'Bàn 4 người',
              maxPeople: 4,
              quantity: 15,
              dishType: 'Sải sản',
              priceRange: '500k - 1.5tr',
              cooperation: coop,
              active: true,
            }),
            this.tableRepo.create({
              name: 'Bàn tiệc lớn (10 người)',
              maxPeople: 10,
              quantity: 5,
              dishType: 'Tổng hợp',
              priceRange: '2tr - 5tr',
              cooperation: coop,
              active: true,
            }),
          ]);
        }
      } else if (coop.type === 'delivery') {
        const count = await this.vehicleRepo.count({
          where: { cooperation: { id: coop.id } },
        });
        if (count === 0) {
          await this.vehicleRepo.save([
            this.vehicleRepo.create({
              typeName: 'Xe máy',
              weightLimit: '30kg',
              sizeLimit: '40x40x40',
              priceLessThan10Km: '15000',
              priceMoreThan10Km: '5000',
              cooperation: coop,
            }),
            this.vehicleRepo.create({
              typeName: 'Xe tải nhỏ (500kg)',
              weightLimit: '500kg',
              sizeLimit: '1.5x1x1m',
              priceLessThan10Km: '150000',
              priceMoreThan10Km: '12000',
              cooperation: coop,
            }),
          ]);
        }
      } else if (coop.type === 'bus') {
        const count = await this.busTypeRepo.count({
          where: { cooperation: { id: coop.id } },
        });
        if (count === 0) {
          await this.busTypeRepo.save([
            this.busTypeRepo.create({
              name: 'Xe giường nằm 36 chỗ',
              numberOfSeats: 36,
              numberOfBuses: 50,
              price: '250000',
              route: 'Hồ Chí Minh - Đà Lạt',
              cooperation: coop,
            }),
            this.busTypeRepo.create({
              name: 'Xe Limousine 9 chỗ',
              numberOfSeats: 9,
              numberOfBuses: 20,
              price: '450000',
              route: 'Hồ Chí Minh - Vũng Tàu',
              cooperation: coop,
            }),
          ]);
        }
      } else if (coop.type === 'train') {
        const count = await this.trainRouteRepo.count({
          where: { cooperation: { id: coop.id } },
        });
        if (count === 0) {
          await this.trainRouteRepo.save([
            this.trainRouteRepo.create({
              name: 'Tàu Thống Nhất SE1',
              departureStation: 'Hà Nội',
              arrivalStation: 'Sài Gòn',
              departureTime: '22:15:00+07',
              arrivalTime: '05:45:00+07',
              basePrice: '1100000',
              seatCapacity: 400,
              cooperation: coop,
            }),
            this.trainRouteRepo.create({
              name: 'Tàu SE3',
              departureStation: 'Hà Nội',
              arrivalStation: 'Đà Nẵng',
              departureTime: '19:25:00+07',
              arrivalTime: '11:15:00+07',
              basePrice: '750000',
              seatCapacity: 300,
              cooperation: coop,
            }),
          ]);
        }
      } else if (coop.type === 'flight') {
        const count = await this.flightRepo.count({
          where: { cooperation: { id: coop.id } },
        });
        if (count === 0) {
          const now = new Date();
          const later = new Date(now.getTime() + 2 * 3600000);
          await this.flightRepo.save([
            this.flightRepo.create({
              flightNumber: 'VN123',
              airline: coop.name,
              departureAirport: 'SGN',
              arrivalAirport: 'HAN',
              departureTime: now,
              arrivalTime: later,
              basePrice: '1500000',
              seatCapacity: 180,
              cooperation: coop,
            }),
            this.flightRepo.create({
              flightNumber: 'VJ456',
              airline: coop.name,
              departureAirport: 'SGN',
              arrivalAirport: 'DAD',
              departureTime: now,
              arrivalTime: later,
              basePrice: '1200000',
              seatCapacity: 230,
              cooperation: coop,
            }),
          ]);
        }
      } else if (coop.type === 'tour') {
        const destinations = await this.destRepo.find({ take: 2 });
        for (const dest of destinations) {
          dest.hasTourTickets = true;
          dest.tourPriceRange = '500.000đ - 2.000.000đ';
          dest.cooperationId = coop.id;
          await this.destRepo.save(dest);
        }
      }
    }
    return {
      message: 'Service data (rooms, tables, etc.) seeded successfully',
    };
  }

  // MOCK AVAILABILITY LOGIC - Now respects query filters
  async getMockHotelRooms(query: {
    provinceId?: string;
    districtId?: string;
    checkInDate?: string;
    checkOutDate?: string;
    guests?: number;
  }) {
    const qb = this.coopRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.rooms', 'rooms')
      .where('coop.type = :type', { type: 'hotel' })
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    if (query.provinceId) {
      if (/^\d+$/.test(query.provinceId)) {
        qb.andWhere('coop.provinceId = :provinceId', {
          provinceId: query.provinceId,
        });
      } else {
        qb.andWhere('coop.province ILIKE :province', {
          province: `%${query.provinceId}%`,
        });
      }
    }
    if (query.districtId) {
      if (/^\d+$/.test(query.districtId)) {
        qb.andWhere('coop.districtId = :districtId', {
          districtId: query.districtId,
        });
      } else {
        qb.andWhere('coop.district ILIKE :district', {
          district: `%${query.districtId}%`,
        });
      }
    }

    const hotels = await qb.take(3).getMany();
    const results: any[] = [];
    const guestCount = query.guests ?? 0;

    for (const hotel of hotels) {
      if (hotel.rooms) {
        let filteredRooms = hotel.rooms;
        if (guestCount > 0) {
          filteredRooms = filteredRooms.filter(
            (r) => (r.maxPeople || 2) >= guestCount,
          );
        }
        results.push(
          ...filteredRooms.slice(0, 2).map((room) => ({
            ...room,
            partnerName: hotel.name,
            partnerLogo: hotel.brandLogo,
            checkInDate: query.checkInDate,
            checkOutDate: query.checkOutDate,
            available: Math.random() > 0.2, // 80% chance available
          })),
        );
      }
    }
    return results.slice(0, 6);
  }

  async getMockRestaurantTables(query: {
    provinceId?: string;
    districtId?: string;
    date?: string;
    guests?: number;
  }) {
    const qb = this.coopRepo
      .createQueryBuilder('coop')
      .leftJoinAndSelect('coop.restaurantTables', 'tables')
      .where('coop.type = :type', { type: 'restaurant' })
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    if (query.provinceId) {
      if (/^\d+$/.test(query.provinceId)) {
        qb.andWhere('coop.provinceId = :provinceId', {
          provinceId: query.provinceId,
        });
      } else {
        qb.andWhere('coop.province ILIKE :province', {
          province: `%${query.provinceId}%`,
        });
      }
    }
    if (query.districtId) {
      if (/^\d+$/.test(query.districtId)) {
        qb.andWhere('coop.districtId = :districtId', {
          districtId: query.districtId,
        });
      } else {
        qb.andWhere('coop.district ILIKE :district', {
          district: `%${query.districtId}%`,
        });
      }
    }

    const restaurants = await qb.take(3).getMany();
    const results: any[] = [];
    const guestCount = query.guests ?? 0;

    for (const rest of restaurants) {
      if (rest.restaurantTables) {
        let filteredTables = rest.restaurantTables;
        if (guestCount > 0) {
          filteredTables = filteredTables.filter(
            (t) => (t.maxPeople || 2) >= guestCount,
          );
        }
        results.push(
          ...filteredTables.slice(0, 2).map((table) => ({
            ...table,
            partnerName: rest.name,
            partnerLogo: rest.brandLogo,
            reservationDate: query.date,
            available: Math.random() > 0.3, // 70% chance available
          })),
        );
      }
    }
    return results.slice(0, 6);
  }

  async getMockTransport(
    type: 'bus' | 'train' | 'flight',
    query: { from?: string; to?: string; date?: string },
  ) {
    const qb = this.coopRepo
      .createQueryBuilder('coop')
      .where('coop.type = :type', { type })
      .andWhere('coop.status = :status', { status: CooperationStatus.ACTIVE });

    if (type === 'bus') {
      qb.leftJoinAndSelect('coop.busTypes', 'busTypes');
    } else if (type === 'train') {
      qb.leftJoinAndSelect('coop.trainRoutes', 'trainRoutes');
    } else if (type === 'flight') {
      qb.leftJoinAndSelect('coop.flights', 'flights');
    }

    const partners = await qb.take(3).getMany();
    const results: any[] = [];

    for (const p of partners) {
      let items: any[] = [];
      if (type === 'bus') items = (p as any).busTypes || [];
      else if (type === 'train') items = (p as any).trainRoutes || [];
      else if (type === 'flight') items = (p as any).flights || [];

      // Filter by route if provided
      if (query.from || query.to) {
        items = items.filter((item: any) => {
          const routeField =
            item.route ||
            `${item.departureStation || item.departureAirport} - ${item.arrivalStation || item.arrivalAirport}`;
          const matchFrom =
            !query.from ||
            routeField.toLowerCase().includes(query.from.toLowerCase());
          const matchTo =
            !query.to ||
            routeField.toLowerCase().includes(query.to.toLowerCase());
          return matchFrom && matchTo;
        });
      }

      results.push(
        ...items.slice(0, 2).map((item: any) => ({
          ...item,
          partnerName: p.name,
          partnerLogo: p.brandLogo,
          departureDate: query.date,
          seatMap: this.generateSeatMap(
            item.numberOfSeats || item.seatCapacity || 40,
          ),
        })),
      );
    }
    return results.slice(0, 6);
  }

  async getMockDeliveryBill(id: number) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id },
      relations: ['cooperation'],
    });
    if (!vehicle) {
      // Return mock data even if vehicle not found
      return {
        id: Math.floor(Math.random() * 100000),
        senderName: 'Lê Văn Tám',
        senderPhone: '0908123456',
        receiverName: 'Nguyễn Thị Bưởi',
        receiverPhone: '0912987654',
        pickupPoint: '123 Lê Lợi, Quận 1, TP. HCM',
        deliveryPoint: '456 Nguyễn Huệ, Quận 1, TP. HCM',
        deliveryType: 'Giao hàng nhanh',
        partnerName: 'Lalamove',
        vehicleType: 'Xe máy',
        packagePhoto:
          'https://res.cloudinary.com/traveline/image/upload/v1/package_sample',
        note: 'Giao hàng cẩn thận, hàng dễ vỡ',
        totalPrice: '55000',
        status: 'PENDING',
        paymentQr:
          'https://res.cloudinary.com/traveline/image/upload/v1/qr_sample',
      };
    }

    return {
      id: Math.floor(Math.random() * 100000),
      senderName: 'Lê Văn Tám',
      senderPhone: '0908123456',
      receiverName: 'Nguyễn Thị Bưởi',
      receiverPhone: '0912987654',
      pickupPoint: '123 Lê Lợi, Quận 1, TP. HCM',
      deliveryPoint: '456 Nguyễn Huệ, Quận 1, TP. HCM',
      deliveryType: 'Giao hàng nhanh',
      partnerName: vehicle.cooperation?.name,
      vehicleType: vehicle.typeName,
      packagePhoto:
        'https://res.cloudinary.com/traveline/image/upload/v1/package_sample',
      note: 'Giao hàng cẩn thận, hàng dễ vỡ',
      totalPrice: '55000',
      status: 'PENDING',
      paymentQr:
        vehicle.cooperation?.paymentQr ||
        'https://res.cloudinary.com/traveline/image/upload/v1/qr_sample',
    };
  }

  private generateSeatMap(total: number) {
    const map: any[] = [];
    for (let i = 1; i <= total; i++) {
      map.push({
        id: i,
        label: `${i}`,
        booked: Math.random() > 0.7,
      });
    }
    return map;
  }
}
