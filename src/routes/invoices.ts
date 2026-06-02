import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/invoices — Admin & Staff
// Query params: status, date (YYYY-MM-DD), search, page, limit
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, date, search, page = '1', limit = '50' } = req.query;

  const filter: Record<string, unknown> = {};

  if (status && (status === 'paid' || status === 'unpaid')) {
    filter.status = status;
  }

  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    filter.createdAt = { $gte: start, $lte: end };
  }

  if (search) {
    const regex = new RegExp(String(search), 'i');
    filter.$or = [
      { billId: regex },
      { customerName: regex },
      { customerPhone: regex },
      { packageName: regex },
    ];
  }

  const pageNum = Math.max(1, parseInt(String(page)));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
  const skip = (pageNum - 1) * limitNum;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('createdBy', 'name username role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Invoice.countDocuments(filter),
  ]);

  res.json({
    invoices,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/invoices/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const query = mongoose.isValidObjectId(id)
    ? Invoice.findById(id)
    : Invoice.findOne({ billId: id.toUpperCase() });

  const invoice = await query.populate('createdBy', 'name username role');

  if (!invoice) {
    res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    return;
  }
  res.json(invoice);
});

// POST /api/invoices — Admin & Staff tạo phiếu
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    customerName,
    customerPhone,
    packageName,
    packageCode,
    duration,
    quantity,
    additionalItems,
    totalAmount,
    status,
    isFishingActive,
    startsAt,
    endsAt,
  } = req.body;

  if (!totalAmount || !startsAt) {
    res.status(400).json({ message: 'Thiếu thông tin bắt buộc: totalAmount, startsAt' });
    return;
  }

  const invoice = await Invoice.create({
    customerName: customerName || 'Khách lẻ',
    customerPhone: customerPhone || '',
    packageName,
    packageCode,
    duration,
    quantity: quantity || 1,
    additionalItems: additionalItems || [],
    totalAmount,
    status: status || 'unpaid',
    isFishingActive: isFishingActive ?? (packageCode ? true : false),
    startsAt,
    endsAt: endsAt || 'Đang chạy',
    createdBy: req.user!._id,
  });

  await invoice.populate('createdBy', 'name username role');
  res.status(201).json(invoice);
});

// PUT /api/invoices/:id/checkout — Admin & Staff checkout cần thủ
router.put('/:id/checkout', async (req: AuthRequest, res: Response): Promise<void> => {
  const { endsAt } = req.body;

  const invoice = await Invoice.findOneAndUpdate(
    {
      _id: mongoose.isValidObjectId(req.params.id) ? req.params.id : undefined,
      isFishingActive: true,
    },
    {
      status: 'paid',
      isFishingActive: false,
      checkedOutAt: new Date(),
      ...(endsAt && { endsAt }),
    },
    { new: true }
  ).populate('createdBy', 'name username role');

  if (!invoice) {
    // Thử tìm theo billId nếu không phải ObjectId
    const byBillId = await Invoice.findOneAndUpdate(
      { billId: req.params.id.toUpperCase(), isFishingActive: true },
      {
        status: 'paid',
        isFishingActive: false,
        checkedOutAt: new Date(),
        ...(endsAt && { endsAt }),
      },
      { new: true }
    ).populate('createdBy', 'name username role');

    if (!byBillId) {
      res.status(404).json({ message: 'Không tìm thấy phiên câu đang hoạt động' });
      return;
    }
    res.json(byBillId);
    return;
  }

  res.json(invoice);
});

// PUT /api/invoices/:id/addons — Admin & Staff thêm vật tư vào phiên câu đang chạy
router.put('/:id/addons', async (req: AuthRequest, res: Response): Promise<void> => {
  const { additionalItems, totalAmount } = req.body;

  if (!additionalItems || totalAmount == null) {
    res.status(400).json({ message: 'Thiếu additionalItems và totalAmount' });
    return;
  }

  const filterById = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id }
    : { billId: req.params.id.toUpperCase() };

  const invoice = await Invoice.findOneAndUpdate(
    { ...filterById, isFishingActive: true },
    { additionalItems, totalAmount },
    { new: true, runValidators: true }
  ).populate('createdBy', 'name username role');

  if (!invoice) {
    res.status(404).json({ message: 'Không tìm thấy phiên câu đang hoạt động' });
    return;
  }

  res.json(invoice);
});

// DELETE /api/invoices/:id — Chỉ Admin
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const filterById = mongoose.isValidObjectId(req.params.id)
    ? { _id: req.params.id }
    : { billId: req.params.id.toUpperCase() };

  const invoice = await Invoice.findOneAndDelete(filterById);

  if (!invoice) {
    res.status(404).json({ message: 'Không tìm thấy hóa đơn' });
    return;
  }
  res.json({ message: `Đã xóa hóa đơn ${invoice.billId}` });
});

export default router;
