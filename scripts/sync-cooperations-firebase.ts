import 'dotenv/config';
import { readFileSync } from 'fs';
import { cert, initializeApp, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DataSource } from 'typeorm';
import { Cooperation } from '../src/modules/cooperation/entities/cooperation.entity';

/**
 * Script này kết nối trực tiếp Firebase Firestore và cập nhật tọa độ vào PostgreSQL
 * Để chạy: npx ts-node -r tsconfig-paths/register scripts/sync-cooperations-firebase.ts
 */

function loadFirebaseCredential(): Record<string, unknown> {
  const inline = process.env.FIREBASE_ADMIN_CREDENTIAL;
  const filePath = process.env.FIREBASE_ADMIN_CREDENTIAL_PATH;

  if (inline) return JSON.parse(inline);
  if (filePath) return JSON.parse(readFileSync(filePath, 'utf8'));

  throw new Error('Cần set FIREBASE_ADMIN_CREDENTIAL hoặc FIREBASE_ADMIN_CREDENTIAL_PATH trong .env');
}

function coerceNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function run() {
  const collectionName = 'COOPERATION';

  try {
    // 1. Khởi tạo Firebase
    initializeApp({
      credential: cert(loadFirebaseCredential()),
    });
    const firestore = getFirestore();

    // 2. Khởi tạo PostgreSQL (Chỉ dùng connection, không cần load hết Entities liên quan)
    const dataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
      synchronize: false,
    });
    await dataSource.initialize();

    console.log(`Đang lấy dữ liệu từ Firebase collection: ${collectionName}...`);
    const snapshot = await firestore.collection(collectionName).get();
    console.log(`Tìm thấy ${snapshot.size} tài liệu trên Firebase.`);

    let updated = 0;
    let notFoundInPg = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const name = (data.name || '').toString().trim();
      
      if (!name) {
        skipped++;
        continue;
      }

      const latitude = coerceNumber(data.latitude);
      const longitude = coerceNumber(data.longitude);
      const province = typeof data.province === 'string' ? data.province : undefined;

      if (latitude === undefined && longitude === undefined && province === undefined) {
        skipped++;
        continue;
      }

      // Sử dụng Raw SQL để update giúp bỏ qua các vấn đề về Metadata/Relation
      // So khớp tên chính xác từng ký tự
      const updateResult = await dataSource.query(
        `UPDATE cooperations 
         SET latitude = COALESCE($1, latitude), 
             longitude = COALESCE($2, longitude), 
             province = COALESCE($3, province) 
         WHERE name = $4`,
        [latitude, longitude, province, name]
      );

      // result[1] chứa số lượng dòng bị ảnh hưởng trong pg
      if (updateResult[1] > 0) {
        updated++;
        console.log(`[OK] Đã cập nhật (${updateResult[1]} bản ghi): ${name}`);
      } else {
        notFoundInPg++;
        // console.warn(`[NOT_FOUND] Không thấy bản ghi trong PostgreSQL: ${name}`);
      }
    }

    await dataSource.destroy();
    console.log('\n--- Kết quả Đồng bộ ---');
    console.log(`Tổng số bản ghi từ Firebase: ${snapshot.size}`);
    console.log(`Cập nhật thành công: ${updated}`);
    console.log(`Không tìm thấy tên tương ứng trong PostgreSQL: ${notFoundInPg}`);
    console.log(`Bỏ qua (thiếu dữ liệu): ${skipped}`);

  } catch (error: any) {
    console.error('Lỗi thực thi:', error.message);
  }
}

run();
