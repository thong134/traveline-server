import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { HotelBillsService } from '../src/modules/hotel/bill/hotel-bill.service';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HotelBill } from '../src/modules/hotel/bill/entities/hotel-bill.entity';
import { User } from '../src/modules/user/entities/user.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(HotelBillsService);
  const userRepo = app.get(getRepositoryToken(User));
  const logger = new Logger('CheckHotelBills');

  // Find a user with bills
  const bills = await service.findAll(1); // Assuming admin user id 1
  console.log(`Checking bills for User 1: Found ${bills.length}`);
  
  for (const bill of bills) {
    if (bill.total === undefined) {
        console.error(`Bill ${bill.id} has UNDEFINED total`);
    } else if (bill.total === null) {
        console.error(`Bill ${bill.id} has NULL total`);
    } else {
        console.log(`Bill ${bill.id} total: "${bill.total}" (Type: ${typeof bill.total})`);
    }
  }
  
  // Check any bill in DB
  const repo = app.get(getRepositoryToken(HotelBill));
  const allBills = await repo.find({ take: 10, order: { id: 'DESC' } });
  console.log('--- Random 10 bills from DB ---');
  for (const bill of allBills) {
     console.log(`Bill ${bill.id} total: "${bill.total}"`);
  }

  await app.close();
}

bootstrap();
