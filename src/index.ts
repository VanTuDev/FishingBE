import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import packageRoutes from './routes/packages';
import addonRoutes from './routes/addons';
import invoiceRoutes from './routes/invoices';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import revenueNoteRoutes from './routes/revenueNotes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  // Thêm origins từ env (phân cách bằng dấu phẩy, ví dụ: https://pos-fi.vercel.app,https://pos-fi.netlify.app)
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (Postman, mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/addons', addonRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/revenue-notes', revenueNoteRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Endpoint không tồn tại' });
});

// Global error handler
app.use(errorHandler);

// Start
connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`   Môi trường: ${process.env.NODE_ENV || 'development'}`);

    // Keep-alive: Render free tier ngủ sau 15 phút không có request
    // Tự ping /api/health mỗi 14 phút để giữ server thức
    const selfPingUrl = process.env.RENDER_EXTERNAL_URL;
    if (selfPingUrl) {
      setInterval(() => {
        fetch(`${selfPingUrl}/api/health`)
          .then(() => console.log('⏰ Keep-alive ping OK'))
          .catch(() => {});
      }, 14 * 60 * 1000);
    }
  });
});
