import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { EateriesService } from '../src/modules/eatery/eatery.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(EateriesService);
  const logger = new Logger('UpdateEateryCoordinates');

  const eateriesData = [
    // --- BÌNH DƯƠNG (Center approx: 10.9806, 106.6588) ---
    { id: 72, name: "Bún Bò Huế An Phát", lat: 10.9820, long: 106.6600 },
    { id: 76, name: "Bún Riêu Cô Ba", lat: 10.9850, long: 106.6550 },
    { id: 78, name: "Cơm Niêu Nhà Quê", lat: 10.9780, long: 106.6620 },
    { id: 74, name: "Hải Sản Tươi Sống BD", lat: 10.9900, long: 106.6500 },
    { id: 73, name: "Lẩu Gà Lá É 36", lat: 10.9750, long: 106.6650 },
    { id: 77, name: "Phở Gia Truyền 24h", lat: 10.9880, long: 106.6580 },
    { id: 80, name: "Quán Chay An Lạc", lat: 10.9810, long: 106.6520 },
    { id: 71, name: "Quán Cơm Tấm Phú Lợi", lat: 10.9950, long: 106.6700 },
    { id: 75, name: "Quán Nướng Sân Vườn", lat: 10.9700, long: 106.6450 },
    { id: 79, name: "Ốc Đêm Bình Dương", lat: 10.9830, long: 106.6680 },

    // --- HÀ NỘI (Center approx: 21.0285, 105.8542) ---
    { id: 96, name: "Bánh Cuốn Thanh Trì", lat: 21.0300, long: 105.8500 },
    { id: 92, name: "Bún Chả Hương Liên", lat: 21.0185, long: 105.8550 }, // Obama bun cha
    { id: 94, name: "Bún Thang Gia Truyền", lat: 21.0330, long: 105.8510 },
    { id: 93, name: "Chả Cá Lã Vọng", lat: 21.0360, long: 105.8530 },
    { id: 97, name: "Cơm Niêu Bắc Bộ", lat: 21.0250, long: 105.8450 },
    { id: 98, name: "Lẩu Riêu Cua Bắp Bò", lat: 21.0200, long: 105.8600 },
    { id: 91, name: "Phở Bát Đàn", lat: 21.0320, long: 105.8470 },
    { id: 99, name: "Phở Gà Nguyệt", lat: 21.0290, long: 105.8420 },
    { id: 100, name: "Quán Chay Ưu Đàm", lat: 21.0190, long: 105.8520 },
    { id: 95, name: "Ốc Luộc Hồ Tây", lat: 21.0450, long: 105.8350 },

    // --- NHA TRANG (Center approx: 12.2388, 109.1967) ---
    { id: 117, name: "Bánh Canh Chả Cá", lat: 12.2400, long: 109.1950 },
    { id: 112, name: "Bún Cá Nha Trang", lat: 12.2420, long: 109.1980 },
    { id: 116, name: "Cơm Hải Sản", lat: 12.2350, long: 109.1920 },
    { id: 119, name: "Hải Sản Bình Dân", lat: 12.2450, long: 109.1900 },
    { id: 111, name: "Hải Sản Gió Biển", lat: 12.2500, long: 109.2000 },
    { id: 115, name: "Lẩu Cá Bớp", lat: 12.2380, long: 109.1940 },
    { id: 113, name: "Nem Nướng Đặng Văn Quyên", lat: 12.2480, long: 109.1970 },
    { id: 120, name: "Quán Chay Biển Tâm", lat: 12.2300, long: 109.1930 },
    { id: 118, name: "Quán Nướng Ven Biển", lat: 12.2520, long: 109.2020 },
    { id: 114, name: "Quán Ốc Biển Xanh", lat: 12.2360, long: 109.1960 },

    // --- TP. HỒ CHÍ MINH (Center approx: 10.7769, 106.7009) ---
    { id: 85, name: "Bánh Xèo Miền Trung", lat: 10.7800, long: 106.6950 },
    { id: 82, name: "Bún Đậu Mẹt Tre", lat: 10.7750, long: 106.7050 },
    { id: 88, name: "Cơm Gà Xối Mỡ", lat: 10.7700, long: 106.6980 },
    { id: 81, name: "Cơm Tấm Ba Ghiền", lat: 10.7920, long: 106.6780 }, // Phu Nhuan
    { id: 84, name: "Hủ Tiếu Nam Vang", lat: 10.7650, long: 106.7020 },
    { id: 83, name: "Lẩu Cá Kèo Miền Tây", lat: 10.7780, long: 106.6880 },
    { id: 87, name: "Phở Thìn Sài Gòn", lat: 10.7720, long: 106.7030 },
    { id: 90, name: "Quán Chay Tịnh Tâm", lat: 10.7850, long: 106.6900 },
    { id: 86, name: "Quán Nướng 79", lat: 10.7680, long: 106.7080 },
    { id: 89, name: "Ốc Sài Gòn Xưa", lat: 10.7760, long: 106.7000 },

    // --- ĐÀ NẴNG (Center approx: 16.0544, 108.2022) ---
    { id: 104, name: "Bánh Tráng Cuốn Thịt Heo", lat: 16.0550, long: 108.2050 },
    { id: 102, name: "Bún Chả Cá 109", lat: 16.0600, long: 108.2100 },
    { id: 108, name: "Bún Mắm Nêm", lat: 16.0520, long: 108.2000 },
    { id: 105, name: "Cơm Gà Tam Kỳ", lat: 16.0480, long: 108.2080 },
    { id: 103, name: "Hải Sản Bé Mặn", lat: 16.0750, long: 108.2450 }, // Near beach
    { id: 107, name: "Lẩu Thái Cay", lat: 16.0580, long: 108.2020 },
    { id: 101, name: "Mì Quảng Bà Mua", lat: 16.0500, long: 108.2150 },
    { id: 110, name: "Quán Chay An Nhiên", lat: 16.0530, long: 108.2030 },
    { id: 106, name: "Quán Nướng Biển Đông", lat: 16.0700, long: 108.2400 },
    { id: 109, name: "Ốc Hút Đà Nẵng", lat: 16.0560, long: 108.2060 },
  ];

  logger.log('Starting coordinates update...');

  for (const item of eateriesData) {
    try {
      await service.update(item.id, {
        latitude: item.lat,
        longitude: item.long,
      });
      console.log(`Updated ${item.name} (${item.id}): [${item.lat}, ${item.long}]`);
    } catch (e) {
      console.error(`Failed to update ${item.name}`, e);
    }
  }

  logger.log('Update finished.');
  await app.close();
}

bootstrap();
