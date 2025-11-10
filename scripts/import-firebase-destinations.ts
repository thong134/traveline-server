import 'dotenv/config';
import { readFileSync } from 'fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DataSource } from 'typeorm';
import { Destination } from '../src/destinations/destinations.entity';

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

  throw new Error('Set FIREBASE_ADMIN_CREDENTIAL (JSON string) or FIREBASE_ADMIN_CREDENTIAL_PATH (file path)');
}

function parseDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  if (typeof value === 'object' && value !== null) {
    const seconds = (value as { _seconds?: number })._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000);
    }
  }

  if (typeof value === 'string') {
    const normalised = value.includes('T') ? value : value.replace(' ', 'T');
    const date = new Date(normalised);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

async function bootstrap() {
  // const dbHost = requireEnv('DB_HOST');
  // const dbUser = requireEnv('DB_USER');
  // const dbPass = requireEnv('DB_PASS');
  // const dbName = requireEnv('DB_NAME');
  // const dbPort = Number(process.env.DB_PORT ?? '5432');
  // const dbSsl = process.env.DB_SSL === 'true';
  const collectionName = process.env.FIREBASE_COLLECTION ?? 'DESTINATION';

  initializeApp({
    credential: cert(loadFirebaseCredential()),
  });

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,  
    ssl: { rejectUnauthorized: false },
    entities: [Destination],
    synchronize: false,
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(Destination);
  const firestore = getFirestore();

  const snapshot = await firestore.collection(collectionName).get();
  console.log(`Fetched ${snapshot.size} Firebase documents from ${collectionName}`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const name = (data.destinationName || data.name || doc.id)?.toString();
    const latitude = coerceNumber(data.latitude);
    const longitude = coerceNumber(data.longitude);

    if (!name || latitude == null || longitude == null) {
      skipped += 1;
      console.warn(`Skipping ${doc.id} due to missing name/coordinates`);
      continue;
    }

    const photos = coerceStringArray(data.photo ?? data.photos);
    const categories = coerceStringArray(data.categories);
    const videos = coerceStringArray(data.video ?? data.videos);

    const payload: Partial<Destination> = {
      name,
      type: typeof data.type === 'string' ? data.type : undefined,
      descriptionViet: typeof data.descriptionViet === 'string' ? data.descriptionViet : undefined,
      descriptionEng: typeof data.descriptionEng === 'string' ? data.descriptionEng : undefined,
      province: typeof data.province === 'string' ? data.province : undefined,
      specificAddress:
        typeof data.specificAddress === 'string' ? data.specificAddress : undefined,
      latitude,
      longitude,
      rating: coerceNumber(data.rating),
      favouriteTimes: coerceNumber(data.favouriteTimes) ?? 0,
      userRatingsTotal: coerceNumber(data.userRatingsTotal) ?? 0,
      categories,
      photos,
      videos,
      googlePlaceId: typeof data.place_id === 'string' ? data.place_id : undefined,
      available: typeof data.available === 'boolean' ? data.available : true,
      sourceCreatedAt: parseDate(data.createdDate),
    };

    let entity = await repo.findOne({ where: { name, latitude, longitude } });

    if (!entity) {
      entity = repo.create(payload);
      await repo.save(entity);
      created += 1;
    } else {
      Object.assign(entity, payload);
      await repo.save(entity);
      updated += 1;
    }
  }

  await dataSource.destroy();

  console.log(
    `Import finished. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Total processed: ${snapshot.size}`,
  );
}

bootstrap().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
