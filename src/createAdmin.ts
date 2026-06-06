import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase } from './config/database';
import User from './models/User';

const ADMINS = [
  { email: 'vantu.dev@gmail.com', password: 'vantu16022003@', name: 'Nguyễn Văn Tú', role: 'admin' as const },
  { email: 'admin@gmail.com',     password: 'admin1234',       name: 'Admin',         role: 'admin' as const },
];

async function createAdmins() {
  await connectDatabase();

  for (const admin of ADMINS) {
    const existing = await User.findOne({ email: admin.email });
    if (existing) {
      console.log(`⏭  ${admin.email} đã tồn tại — bỏ qua`);
      continue;
    }
    await User.create(admin);
    console.log(`✅ Tạo admin: ${admin.email} | mật khẩu: ${admin.password}`);
  }

  console.log('\n🎉 Hoàn tất!\n');
  process.exit(0);
}

createAdmins().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
