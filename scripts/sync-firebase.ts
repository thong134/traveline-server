import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script này đọc file JSON xuất từ Firebase và gọi API sync-firebase của server
 * Để chạy: npx ts-node scripts/sync-firebase.ts
 */

const API_URL = 'http://localhost:3000/cooperations/sync-firebase';
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN_HERE'; // Cần token admin để gọi endpoint này
const DATA_FILE = path.join(__dirname, '../firebase_data.json');

async function sync() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.error(`Không tìm thấy file dữ liệu tại: ${DATA_FILE}`);
      console.log('Vui lòng xuất dữ liệu Firebase ra file này trước.');
      return;
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`Bắt đầu đồng bộ ${data.length} bản ghi...`);

    const response = await axios.post(API_URL, data, {
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
    });

    console.log('Kết quả đồng bộ:');
    console.log(`- Đã cập nhật: ${response.data.updated}`);
    console.log(`- Đã bỏ qua: ${response.data.skipped}`);
    
    // Lưu lại chi tiết nếu cần
    // fs.writeFileSync('sync_results.json', JSON.stringify(response.data.details, null, 2));

  } catch (error: any) {
    console.error('Lỗi khi đồng bộ:', error.response?.data || error.message);
  }
}

sync();
