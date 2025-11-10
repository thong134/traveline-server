import 'dotenv/config';
import { readFileSync } from 'fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DataSource } from 'typeorm';
import { VehicleCatalog } from '../src/vehicle-catalog/vehicle-catalog.entity';

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
    return String(value);
  }
  return undefined;
}

function coercePositiveInt(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  return rounded >= 0 ? rounded : undefined;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => coerceString(item))
    .filter((item): item is string => item !== undefined);
}

async function bootstrap() {
  const databaseUrl = requireEnv('DATABASE_URL');
  const collectionName =
    process.env.FIREBASE_VEHICLE_COLLECTION ?? 'VEHICLE_INFORMATION';

  if (!getApps().length) {
    initializeApp({
      credential: cert(loadFirebaseCredential()),
    });
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: { rejectUnauthorized: false },
  entities: [VehicleCatalog],
    synchronize: false,
  });

  await dataSource.initialize();
  const repo = dataSource.getRepository(VehicleCatalog);
  const firestore = getFirestore();

  const snapshot = await firestore.collection(collectionName).get();
  console.log(
    `Fetched ${snapshot.size} Firebase documents from ${collectionName}`,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};

    const type = coerceString(data.type ?? data.vehicleType ?? data.category);
    const brand = coerceString(data.brand ?? data.vehicleBrand);
    const model = coerceString(data.model ?? data.vehicleModel ?? data.name);
    const color = coerceString(data.color ?? data.vehicleColor ?? 'Unknown');

    if (!type || !brand || !model) {
      skipped += 1;
      console.warn(`Skipping ${doc.id} due to missing type/brand/model`);
      continue;
    }

    const seatingCapacity =
      coercePositiveInt(data.seatingCapacity ?? data.capacity) ?? 0;
    const fuelType = coerceString(data.fuelType ?? data.fuel);
    const maxSpeed = coerceString(data.maxSpeed);
    const transmission = coerceString(
      data.transmission ?? data.gearbox ?? data.transmissionType,
    );
    const photos = coerceStringArray(data.photos ?? data.photoUrls);
    const primaryPhoto = coerceString(data.photo ?? data.thumbnail);
    const photo = photos[0] ?? primaryPhoto;

    const payload: Partial<VehicleCatalog> = {
      type,
      brand,
      model,
      color,
      seatingCapacity,
      fuelType,
      maxSpeed,
      transmission,
      photo,
    };

    let entity = await repo.findOne({ where: { type, brand, model, color } });

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
    `Vehicle catalog import finished. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Total processed: ${snapshot.size}`,
  );
}

bootstrap().catch((error) => {
  console.error('Vehicle catalog import failed:', error);
  process.exit(1);
});
