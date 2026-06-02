import { Router, Response } from 'express';
import Package from '../models/Package';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(authenticate);

// GET /api/packages — Admin & Staff xem được
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const packages = await Package.find().sort({ createdAt: 1 });
  res.json(packages);
});

// GET /api/packages/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) {
    res.status(404).json({ message: 'Không tìm thấy gói câu' });
    return;
  }
  res.json(pkg);
});

// POST /api/packages — Chỉ Admin
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name, duration, price, status, description } = req.body;

  if (!code || !name || !duration || price == null) {
    res.status(400).json({ message: 'Thiếu thông tin bắt buộc: code, name, duration, price' });
    return;
  }

  const existing = await Package.findOne({ code: code.toUpperCase() });
  if (existing) {
    res.status(409).json({ message: `Mã gói "${code.toUpperCase()}" đã tồn tại` });
    return;
  }

  const pkg = await Package.create({ code, name, duration, price, status, description });
  res.status(201).json(pkg);
});

// PUT /api/packages/:id — Chỉ Admin
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, name, duration, price, status, description } = req.body;

  if (code) {
    const conflict = await Package.findOne({
      code: code.toUpperCase(),
      _id: { $ne: req.params.id },
    });
    if (conflict) {
      res.status(409).json({ message: `Mã gói "${code.toUpperCase()}" đã được dùng` });
      return;
    }
  }

  const pkg = await Package.findByIdAndUpdate(
    req.params.id,
    { code, name, duration, price, status, description },
    { new: true, runValidators: true }
  );

  if (!pkg) {
    res.status(404).json({ message: 'Không tìm thấy gói câu' });
    return;
  }
  res.json(pkg);
});

// DELETE /api/packages/:id — Chỉ Admin
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const pkg = await Package.findByIdAndDelete(req.params.id);
  if (!pkg) {
    res.status(404).json({ message: 'Không tìm thấy gói câu' });
    return;
  }
  res.json({ message: 'Đã xóa gói câu thành công' });
});

export default router;
