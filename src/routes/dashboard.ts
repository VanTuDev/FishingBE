import { Router, Response } from 'express';
import Invoice from '../models/Invoice';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/stats — Tổng quan dashboard (Admin & Staff)
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [
    todayInvoices,
    activeSessionCount,
    allTimeRevenue,
    unpaidTotal,
  ] = await Promise.all([
    // Hóa đơn hôm nay
    Invoice.find({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    // Số phiên đang câu
    Invoice.countDocuments({ isFishingActive: true }),
    // Tổng doanh thu (paid)
    Invoice.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    // Tổng nợ chưa thu (unpaid)
    Invoice.aggregate([
      { $match: { status: 'unpaid', isFishingActive: false } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  const todayRevenue = todayInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const todayInvoiceCount = todayInvoices.length;

  // Doanh thu 7 ngày gần nhất
  const days: { day: string; date: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

    const dayRevenue = await Invoice.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    days.push({
      day: dayNames[d.getDay()],
      date: d.toISOString().split('T')[0],
      value: dayRevenue[0]?.total ?? 0,
    });
  }

  res.json({
    today: {
      revenue: todayRevenue,
      invoiceCount: todayInvoiceCount,
    },
    activeSessionCount,
    allTimeRevenue: allTimeRevenue[0]?.total ?? 0,
    unpaidTotal: unpaidTotal[0]?.total ?? 0,
    weeklyRevenue: days,
  });
});

// GET /api/dashboard/recent — 5 hóa đơn gần nhất
router.get('/recent', async (_req: AuthRequest, res: Response): Promise<void> => {
  const invoices = await Invoice.find()
    .populate('createdBy', 'name username')
    .sort({ createdAt: -1 })
    .limit(5);
  res.json(invoices);
});

export default router;
