import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  differenceInCalendarDays,
  isBefore,
  isValid,
  parseISO,
} from 'date-fns';
import { Repository } from 'typeorm';
import { Cooperation } from './entities/cooperation.entity';
import {
  MOCK_PARTNER_DATA,
  MockHotelBooking,
  MockHotelRoom,
} from './mock-partner-data';

export interface HotelAvailabilityItem extends MockHotelRoom {
  availableRooms: number;
  nightlyRate: string;
  totalAmount: string;
  partnerConfirmationCode: string;
}

export interface HotelAvailabilityResponse {
  cooperation: {
    id: number;
    name: string;
    code?: string;
    partnerName: string;
  };
  checkIn: string;
  checkOut: string;
  nights: number;
  roomsRequested: number;
  availability: HotelAvailabilityItem[];
  pulledAt: string;
}

interface HotelAvailabilityParams {
  checkIn: string;
  checkOut: string;
  rooms?: number;
  guests?: number;
}

@Injectable()
export class PartnerCatalogService {
  constructor(
    @InjectRepository(Cooperation)
    private readonly cooperationRepo: Repository<Cooperation>,
  ) {}

  async getHotelAvailability(
    cooperationId: number,
    query: HotelAvailabilityParams,
  ): Promise<HotelAvailabilityResponse> {
    const cooperation = await this.cooperationRepo.findOne({
      where: { id: cooperationId },
    });
    if (!cooperation) {
      throw new NotFoundException(`Cooperation ${cooperationId} not found`);
    }
    if (cooperation.type !== 'hotel') {
      throw new BadRequestException(
        'Hotel availability is only supported for hotel cooperations',
      );
    }

    const checkIn = parseISO(query.checkIn);
    const checkOut = parseISO(query.checkOut);
    if (!isValid(checkIn) || !isValid(checkOut)) {
      throw new BadRequestException('checkIn and checkOut must be ISO dates');
    }
    if (!isBefore(checkIn, checkOut)) {
      throw new BadRequestException('checkIn must be before checkOut');
    }

    const nights = differenceInCalendarDays(checkOut, checkIn);
    if (nights <= 0) {
      throw new BadRequestException(
        'checkOut must be at least one day after checkIn',
      );
    }

    const partnerCode = cooperation.code ?? `HOTEL-${cooperationId}`;
    const partnerData = MOCK_PARTNER_DATA[partnerCode];
    if (!partnerData) {
      throw new NotFoundException(
        `No mocked partner data registered for cooperation code ${partnerCode}`,
      );
    }

    const hotelInventory = partnerData.hotels;
    if (!hotelInventory) {
      throw new NotFoundException(
        `Partner ${partnerCode} does not expose hotel inventory in mock dataset`,
      );
    }

    const availability = hotelInventory.rooms
      .map((room) =>
        this.buildAvailability(
          room,
          hotelInventory.bookings,
          checkIn,
          checkOut,
          nights,
        ),
      )
      .filter((item) => item.availableRooms > 0);

    const roomsRequested = query.rooms ?? 1;
    const filteredAvailability = availability.filter(
      (item) =>
        item.availableRooms >= roomsRequested &&
        item.maxGuests >= (query.guests ?? 1),
    );

    return {
      cooperation: {
        id: cooperation.id,
        name: cooperation.name,
        code: cooperation.code,
        partnerName: partnerData.partnerName,
      },
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      nights,
      roomsRequested,
      availability: filteredAvailability,
      pulledAt: new Date().toISOString(),
    };
  }

  private buildAvailability(
    room: MockHotelRoom,
    bookings: MockHotelBooking[],
    checkIn: Date,
    checkOut: Date,
    nights: number,
  ): HotelAvailabilityItem {
    const overlappingBookings = bookings.filter((booking) =>
      this.hasOverlap(
        checkIn,
        checkOut,
        parseISO(booking.start),
        parseISO(booking.end),
      ),
    );

    const roomsBooked = overlappingBookings.reduce(
      (total, booking) => total + booking.quantity,
      0,
    );

    const availableRooms = Math.max(room.totalRooms - roomsBooked, 0);
    const nightlyRate = this.formatCurrency(room.basePrice, room.currency);
    const totalAmountNumber = room.basePrice * nights;
    const totalAmount = this.formatCurrency(totalAmountNumber, room.currency);

    return {
      ...room,
      availableRooms,
      nightlyRate,
      totalAmount,
      partnerConfirmationCode: `${room.code}-${checkIn.getTime()}`,
    };
  }

  private hasOverlap(
    checkIn: Date,
    checkOut: Date,
    bookingStart: Date,
    bookingEnd: Date,
  ): boolean {
    return checkIn < bookingEnd && bookingStart < checkOut;
  }

  private formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    });
    return formatter.format(amount);
  }
}
