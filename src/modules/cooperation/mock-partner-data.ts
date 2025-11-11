import { addDays } from 'date-fns';

export type MockHotelRoom = {
  code: string;
  name: string;
  description: string;
  maxGuests: number;
  totalRooms: number;
  basePrice: number;
  currency: string;
  amenities: string[];
  photos: string[];
};

export type MockHotelBooking = {
  roomCode: string;
  start: string;
  end: string;
  quantity: number;
};

export type MockHotelInventory = {
  rooms: MockHotelRoom[];
  bookings: MockHotelBooking[];
  taxRate: number;
};

export type MockRestaurantTable = {
  code: string;
  name: string;
  capacity: number;
  indoors: boolean;
  minimumSpend: number;
  slots: Array<{ start: string; end: string; available: number }>;
};

export type MockRestaurantMenuItem = {
  sku: string;
  name: string;
  description: string;
  price: number;
  isSignature: boolean;
};

export type MockRestaurantInventory = {
  tables: MockRestaurantTable[];
  menu: MockRestaurantMenuItem[];
};

export type MockDeliveryVehicle = {
  plateNumber: string;
  capacityKg: number;
  driverName: string;
  driverPhone: string;
  availableFrom: string;
  availableTo: string;
  currentCity: string;
};

export type MockDeliveryInventory = {
  vehicles: MockDeliveryVehicle[];
};

export type MockBusRoute = {
  code: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  seatsTotal: number;
  seatsBooked: number;
  basePrice: number;
};

export type MockBusInventory = {
  routes: MockBusRoute[];
};

export type MockTrainRoute = {
  code: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  cabins: Array<{ class: string; seatsTotal: number; seatsBooked: number; price: number }>;
};

export type MockTrainInventory = {
  routes: MockTrainRoute[];
};

export type MockFlight = {
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  fareClasses: Array<{ cabin: string; seatsTotal: number; seatsBooked: number; price: number }>;
};

export type MockFlightInventory = {
  flights: MockFlight[];
};

export type MockPartnerData = {
  partnerName: string;
  hotels?: MockHotelInventory;
  restaurants?: MockRestaurantInventory;
  deliveries?: MockDeliveryInventory;
  bus?: MockBusInventory;
  train?: MockTrainInventory;
  flight?: MockFlightInventory;
};

// NOTE: This is demo data that mimics what a partner integration layer could return.
// In production this would be replaced by real HTTP calls to partner systems.
export const MOCK_PARTNER_DATA: Record<string, MockPartnerData> = {
  'HOTEL-VINH-001': {
    partnerName: 'Vinh Riverside Hospitality',
    hotels: {
      rooms: [
        {
          code: 'DELUXE-KING',
          name: 'Deluxe King River View',
          description:
            'Spacious 32m² room with balcony overlooking the Lam River and dedicated workspace.',
          maxGuests: 3,
          totalRooms: 18,
          basePrice: 1580000,
          currency: 'VND',
          amenities: ['wifi', 'breakfast', 'workspace', 'balcony', 'bathtub'],
          photos: [
            'https://images.example.com/hotels/vinh-riverside/deluxe-king-01.jpg',
            'https://images.example.com/hotels/vinh-riverside/deluxe-king-02.jpg',
          ],
        },
        {
          code: 'FAMILY-SUITE',
          name: 'Family Suite City View',
          description:
            'Two-bedroom suite ideal for families. Includes kitchenette and kids play corner.',
          maxGuests: 5,
          totalRooms: 10,
          basePrice: 2890000,
          currency: 'VND',
          amenities: ['wifi', 'breakfast', 'kitchenette', 'city-view', 'kids-corner'],
          photos: [
            'https://images.example.com/hotels/vinh-riverside/family-suite-01.jpg',
          ],
        },
        {
          code: 'EXECUTIVE-CLUB',
          name: 'Executive Club Lounge Access',
          description:
            'High floor room with access to the Riverside Club lounge, evening cocktails included.',
          maxGuests: 2,
          totalRooms: 12,
          basePrice: 2450000,
          currency: 'VND',
          amenities: ['wifi', 'breakfast', 'club-lounge', 'airport-transfer'],
          photos: [
            'https://images.example.com/hotels/vinh-riverside/executive-club-01.jpg',
          ],
        },
      ],
      bookings: [
        {
          roomCode: 'DELUXE-KING',
          start: addDays(new Date(), 1).toISOString(),
          end: addDays(new Date(), 4).toISOString(),
          quantity: 8,
        },
        {
          roomCode: 'FAMILY-SUITE',
          start: addDays(new Date(), 3).toISOString(),
          end: addDays(new Date(), 6).toISOString(),
          quantity: 3,
        },
        {
          roomCode: 'EXECUTIVE-CLUB',
          start: addDays(new Date(), 2).toISOString(),
          end: addDays(new Date(), 3).toISOString(),
          quantity: 6,
        },
      ],
      taxRate: 0.08,
    },
    restaurants: {
      tables: [
        {
          code: 'SKY-001',
          name: 'Sky Lounge Window Pair',
          capacity: 2,
          indoors: true,
          minimumSpend: 650000,
          slots: [
            {
              start: addDays(new Date(), 1).toISOString(),
              end: addDays(new Date(), 1.5).toISOString(),
              available: 6,
            },
            {
              start: addDays(new Date(), 1.5).toISOString(),
              end: addDays(new Date(), 2).toISOString(),
              available: 4,
            },
          ],
        },
        {
          code: 'RIVER-BOARDROOM',
          name: 'Riverside Private Dining',
          capacity: 10,
          indoors: true,
          minimumSpend: 3500000,
          slots: [
            {
              start: addDays(new Date(), 2).toISOString(),
              end: addDays(new Date(), 2.25).toISOString(),
              available: 1,
            },
          ],
        },
      ],
      menu: [
        {
          sku: 'APP-CHA-CA',
          name: 'Cha Ca Vinh Style',
          description: 'Local river fish grilled with dill and peanuts.',
          price: 165000,
          isSignature: true,
        },
        {
          sku: 'DRK-RIVER-MULE',
          name: 'Riverside Mule',
          description: 'Vodka, ginger beer, lemongrass syrup, citrus.',
          price: 135000,
          isSignature: true,
        },
      ],
    },
    bus: {
      routes: [
        {
          code: 'VINH-HANOI-01',
          origin: 'Vinh',
          destination: 'Ha Noi',
          departureTime: addDays(new Date(), 1).toISOString(),
          arrivalTime: addDays(new Date(), 1).toISOString(),
          seatsTotal: 40,
          seatsBooked: 31,
          basePrice: 280000,
        },
      ],
    },
  },
  'HOTEL-DN-002': {
    partnerName: 'Da Nang Oceanic Group',
    hotels: {
      rooms: [
        {
          code: 'OCEAN-STUDIO',
          name: 'Ocean Studio Panorama',
          description:
            'Corner studio with 180° panorama windows facing My Khe beach. Includes kitchenette.',
          maxGuests: 2,
          totalRooms: 22,
          basePrice: 2150000,
          currency: 'VND',
          amenities: ['wifi', 'breakfast', 'panorama-view', 'kitchenette'],
          photos: [
            'https://images.example.com/hotels/dn-oceanic/ocean-studio-01.jpg',
          ],
        },
        {
          code: 'SKY-VILLA',
          name: 'Sky Villa Private Pool',
          description:
            'Penthouse villa with plunge pool, private butler, and complimentary sunset cruise.',
          maxGuests: 4,
          totalRooms: 6,
          basePrice: 6890000,
          currency: 'VND',
          amenities: ['wifi', 'breakfast', 'private-pool', 'butler', 'sunset-cruise'],
          photos: [
            'https://images.example.com/hotels/dn-oceanic/sky-villa-01.jpg',
            'https://images.example.com/hotels/dn-oceanic/sky-villa-02.jpg',
          ],
        },
      ],
      bookings: [
        {
          roomCode: 'OCEAN-STUDIO',
          start: addDays(new Date(), 5).toISOString(),
          end: addDays(new Date(), 9).toISOString(),
          quantity: 12,
        },
        {
          roomCode: 'SKY-VILLA',
          start: addDays(new Date(), 6).toISOString(),
          end: addDays(new Date(), 7).toISOString(),
          quantity: 3,
        },
      ],
      taxRate: 0.1,
    },
    restaurants: {
      tables: [
        {
          code: 'SUNSET-001',
          name: 'Sunset Roof Deck',
          capacity: 4,
          indoors: false,
          minimumSpend: 950000,
          slots: [
            {
              start: addDays(new Date(), 3).toISOString(),
              end: addDays(new Date(), 3.25).toISOString(),
              available: 5,
            },
          ],
        },
      ],
      menu: [
        {
          sku: 'SEAFOOD-TASTING',
          name: 'Oceanic Tasting Menu',
          description: 'Seven-course seafood menu featuring central coast catch.',
          price: 995000,
          isSignature: true,
        },
      ],
    },
    flight: {
      flights: [
        {
          flightNumber: 'OC707',
          airline: 'Oceanic Air',
          origin: 'DAD',
          destination: 'SGN',
          departureTime: addDays(new Date(), 1).toISOString(),
          arrivalTime: addDays(new Date(), 1).toISOString(),
          fareClasses: [
            { cabin: 'Economy', seatsTotal: 150, seatsBooked: 112, price: 1650000 },
            { cabin: 'Business', seatsTotal: 24, seatsBooked: 14, price: 4650000 },
          ],
        },
      ],
    },
  },
  'DELIVERY-HCM-001': {
    partnerName: 'Sai Gon Cargo Network',
    deliveries: {
      vehicles: [
        {
          plateNumber: '51H-99888',
          capacityKg: 1200,
          driverName: 'Tran Van Long',
          driverPhone: '+84-918-123-456',
          availableFrom: addDays(new Date(), 0).toISOString(),
          availableTo: addDays(new Date(), 2).toISOString(),
          currentCity: 'Ho Chi Minh City',
        },
        {
          plateNumber: '51H-66789',
          capacityKg: 800,
          driverName: 'Nguyen Thi Mai',
          driverPhone: '+84-936-555-210',
          availableFrom: addDays(new Date(), 1).toISOString(),
          availableTo: addDays(new Date(), 4).toISOString(),
          currentCity: 'Ho Chi Minh City',
        },
      ],
    },
  },
  'TRAIN-NORTH-001': {
    partnerName: 'Northern Rail Alliance',
    train: {
      routes: [
        {
          code: 'SE1',
          origin: 'Ha Noi',
          destination: 'Hue',
          departureTime: addDays(new Date(), 1).toISOString(),
          arrivalTime: addDays(new Date(), 1.5).toISOString(),
          cabins: [
            { class: '4-berth', seatsTotal: 64, seatsBooked: 40, price: 980000 },
            { class: 'soft-seat', seatsTotal: 120, seatsBooked: 67, price: 620000 },
          ],
        },
      ],
    },
  },
  'BUS-HIGHLAND-001': {
    partnerName: 'Highland Express',
    bus: {
      routes: [
        {
          code: 'DALAT-NHA-TRANG-001',
          origin: 'Da Lat',
          destination: 'Nha Trang',
          departureTime: addDays(new Date(), 2).toISOString(),
          arrivalTime: addDays(new Date(), 2).toISOString(),
          seatsTotal: 34,
          seatsBooked: 18,
          basePrice: 240000,
        },
        {
          code: 'DALAT-SAI-GON-002',
          origin: 'Da Lat',
          destination: 'Ho Chi Minh City',
          departureTime: addDays(new Date(), 3).toISOString(),
          arrivalTime: addDays(new Date(), 3).toISOString(),
          seatsTotal: 40,
          seatsBooked: 26,
          basePrice: 360000,
        },
      ],
    },
  },
  'FLIGHT-BAMBOO-001': {
    partnerName: 'Bamboo Sky Partners',
    flight: {
      flights: [
        {
          flightNumber: 'QH215',
          airline: 'Bamboo Airways',
          origin: 'HAN',
          destination: 'PQC',
          departureTime: addDays(new Date(), 4).toISOString(),
          arrivalTime: addDays(new Date(), 4).toISOString(),
          fareClasses: [
            { cabin: 'Economy', seatsTotal: 162, seatsBooked: 88, price: 2250000 },
            { cabin: 'PremiumEconomy', seatsTotal: 28, seatsBooked: 12, price: 3980000 },
          ],
        },
      ],
    },
  },
};
