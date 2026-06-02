import { Router, Response } from 'express';
import RevenueNote from '../models/RevenueNote';
import Invoice from '../models/Invoice';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/revenue-notes
// Query: month=YYYY-MM (lọc theo tháng), from=YYYY-MM-DD&to=YYYY-MM-DD
// Trả về: manual notes + tổng hợp invoice theo ngày
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { month, from, to } = req.query;

  // Xác định khoảng ngày cần lấy
  let dateFrom: string;
  let dateTo: string;

  if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    dateFrom = `${month}-01`;
    dateTo = `${month}-${String(lastDay).padStart(2, '0')}`;
  } else if (from && to) {
    dateFrom = String(from);
    dateTo = String(to);
  } else {
    // Mặc định: tháng hiện tại
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    dateFrom = `${y}-${m}-01`;
    dateTo = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  }

  // Lấy manual notes trong khoảng
  const notes = await RevenueNote.find({
    date: { $gte: dateFrom, $lte: dateTo },
  })
    .populate('createdBy', 'name email role')
    .sort({ date: 1, createdAt: 1 });

  // Tổng hợp doanh thu POS theo ngày trong khoảng
  const startDt = new Date(`${dateFrom}T00:00:00.000Z`);
  const endDt = new Date(`${dateTo}T23:59:59.999Z`);

  const posAgg = await Invoice.aggregate([
    { $match: { status: 'paid', createdAt: { $gte: startDt, $lte: endDt } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    dateFrom,
    dateTo,
    manualNotes: notes,
    posByDay: posAgg.map((r) => ({ date: r._id, total: r.total, count: r.count })),
  });
});

// POST /api/revenue-notes — Chỉ Admin
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, label, amount, note } = req.body;

  if (!date || !label || amount == null) {
    res.status(400).json({ message: 'Thiếu thông tin bắt buộc: date, label, amount' });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ message: 'Định dạng date phải là YYYY-MM-DD' });
    return;
  }

  const entry = await RevenueNote.create({
    date,
    label,
    amount,
    note: note || '',
    createdBy: req.user!._id,
  });

  await entry.populate('createdBy', 'name email role');
  res.status(201).json(entry);
});

// PUT /api/revenue-notes/:id — Chỉ Admin
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, label, amount, note } = req.body;

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ message: 'Định dạng date phải là YYYY-MM-DD' });
    return;
  }

  const entry = await RevenueNote.findByIdAndUpdate(
    req.params.id,
    { date, label, amount, note },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name email role');

  if (!entry) {
    res.status(404).json({ message: 'Không tìm thấy mục doanh số' });
    return;
  }
  res.json(entry);
});

// DELETE /api/revenue-notes/:id — Chỉ Admin
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const entry = await RevenueNote.findByIdAndDelete(req.params.id);
  if (!entry) {
    res.status(404).json({ message: 'Không tìm thấy mục doanh số' });
    return;
  }
  res.json({ message: 'Đã xóa mục doanh số' });
});

export default router;
