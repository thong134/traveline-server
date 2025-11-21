import 'dotenv/config';
import { readFileSync } from 'fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DataSource } from 'typeorm';
import { Cooperation } from '../src/modules/cooperation/entities/cooperation.entity';
import { Eatery } from '../src/modules/eatery/entities/eatery.entity';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

function loadFirebaseCredential(): Record<string, unknown> {
  const inline = process.env.FIREBASE_ADMIN_CREDENTIAL;
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIAL_PATH;

  if (inline) {
    return JSON.parse(inline);
  }

  if (filePath) {
    const fileContent = readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  }

  throw new Error(
    'Set FIREBASE_ADMIN_CREDENTIAL (JSON string) or FIREBASE_ADMIN_CREDENTIAL_PATH (file path)',
  );
}

function coerceString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    const str = String(value).trim();
    return str.length ? str : undefined;
  }

  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const candidate = new Date(normalized);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'object' && value !== null) {
    const seconds = (value as { _seconds?: number; seconds?: number })._seconds ?? (value as { seconds?: number }).seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }

  return undefined;
}

function pickAddress(data: Record<string, unknown>): string | undefined {
  const direct = coerceString(data.address);
  if (direct) {
    return direct;
  }

  const parts = [coerceString(data.district), coerceString(data.city), coerceString(data.province)]
    .filter((part): part is string => Boolean(part));

  if (parts.length) {
    return parts.join(', ');
  }

  return undefined;
}

async function bootstrap(): Promise<void> {
  const databaseUrl = requireEnv('DATABASE_URL');
  const collectionName =
    process.env.FIREBASE_COOPERATION_COLLECTION ?? 'COOPERATION';

  if (!getApps().length) {
    initializeApp({
      credential: cert(loadFirebaseCredential()),
    });
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: { rejectUnauthorized: false },
    entities: [Cooperation, Eatery],
    synchronize: false,
  });

  await dataSource.initialize();
  const cooperationRepo = dataSource.getRepository(Cooperation);
  const eateryRepo = dataSource.getRepository(Eatery);
  const firestore = getFirestore();

  const snapshot = await firestore.collection(collectionName).get();
  console.log(
    `Fetched ${snapshot.size} Firebase documents from ${collectionName}`,
  );

  const allowedCooperationTypes = new Set(['hotel', 'restaurant', 'delivery']);
  let coopCreated = 0;
  let coopUpdated = 0;
  let coopSkipped = 0;
  let eateryCreated = 0;
  let eateryUpdated = 0;
  let eaterySkipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    const rawType = coerceString(data.type) ?? 'hotel';
    const normalizedType = rawType.toLowerCase();

    if (normalizedType === 'eatery') {
      const name = coerceString(data.name);
      const province = coerceString(data.province);

      if (!name || !province) {
        eaterySkipped += 1;
        console.warn(`Skipping eatery ${doc.id} due to missing name/province`);
        continue;
      }

      const address = pickAddress(data);
      const description =
        coerceString(data.introduction) ?? coerceString(data.extension);
      const phone = coerceString(data.bossPhone);
      const imageUrl = coerceString(data.photo);

      const payload: Partial<Eatery> = {
        name,
        province,
        address: address ?? 'Chưa cập nhật',
        description,
        phone,
        imageUrl,
      };

      let entity = await eateryRepo.findOne({ where: { name, province } });

      if (!entity) {
        entity = eateryRepo.create(payload);
        await eateryRepo.save(entity);
        eateryCreated += 1;
      } else {
        Object.assign(entity, payload);
        await eateryRepo.save(entity);
        eateryUpdated += 1;
      }

      continue;
    }

    if (!allowedCooperationTypes.has(normalizedType)) {
      coopSkipped += 1;
      console.warn(`Skipping ${doc.id} due to unsupported type ${rawType}`);
      continue;
    }

    const name = coerceString(data.name);
    const code = coerceString(data.cooperationId ?? data.code ?? doc.id);

    if (!name || !code) {
      coopSkipped += 1;
      console.warn(`Skipping ${doc.id} due to missing name/code`);
      continue;
    }

    const payload: Partial<Cooperation> = {
      code,
      name,
      type: normalizedType,
      numberOfObjects: coerceNumber(data.numberOfObjects) ?? 0,
      numberOfObjectTypes: coerceNumber(data.numberOfObjectTypes) ?? 0,
      bossName: coerceString(data.bossName),
      bossPhone: coerceString(data.bossPhone),
      bossEmail: coerceString(data.bossEmail),
      address: coerceString(data.address),
      district: coerceString(data.district),
      city: coerceString(data.city),
      province: coerceString(data.province),
      photo: coerceString(data.photo),
      extension: coerceString(data.extension),
      introduction: coerceString(data.introduction),
      contractDate: parseDate(data.contractDate),
      contractTerm: coerceString(data.contractTerm),
      bankAccountNumber: coerceString(data.bankAccountNumber),
      bankAccountName: coerceString(data.bankAccountName),
      bankName: coerceString(data.bankName),
      bookingTimes: coerceNumber(data.bookingTimes) ?? 0,
      revenue: (coerceNumber(data.revenue) ?? 0).toFixed(2),
      averageRating: (coerceNumber(data.averageRating) ?? 0).toFixed(2),
      active:
        typeof data.active === 'boolean' ? data.active : true,
    };

    let entity = await cooperationRepo.findOne({ where: { code } });

    if (!entity) {
      entity = cooperationRepo.create(payload);
      await cooperationRepo.save(entity);
      coopCreated += 1;
    } else {
      Object.assign(entity, payload);
      await cooperationRepo.save(entity);
      coopUpdated += 1;
    }
  }

  await dataSource.destroy();

  console.log(
    `Cooperations import finished. Created: ${coopCreated}, Updated: ${coopUpdated}, Skipped: ${coopSkipped}`,
  );
  console.log(
    `Eateries import finished. Created: ${eateryCreated}, Updated: ${eateryUpdated}, Skipped: ${eaterySkipped}`,
  );
}

bootstrap().catch((error) => {
  console.error('Cooperation import failed:', error);
  process.exit(1);
});
