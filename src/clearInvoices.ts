import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from './config/database';
import Invoice from './models/Invoice';
import Counter from './models/Counter';

async function clearInvoices() {
  await connectDatabase();

  const count = await Invoice.countDocuments();
  console.log(`\n🗑  Tìm thấy ${count} hóa đơn trong database.`);

  if (count === 0) {
    console.log('✅ Database đã sạch, không có gì để xóa.\n');
    process.exit(0);
  }

  await Invoice.deleteMany({});
  console.log(`✅ Đã xóa ${count} hóa đơn.`);

  // Reset counter về 2039 để BL bắt đầu lại từ BL-2040
  await Counter.findOneAndUpdate(
    { name: 'invoice' },
    { seq: 2039 },
    { upsert: true }
  );
  console.log('✅ Reset counter hóa đơn về BL-2040.\n');

  process.exit(0);
}

clearInvoices().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
