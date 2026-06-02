import { Router, Response } from 'express';
import Addon from '../models/Addon';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/addons — Admin & Staff
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, status } = req.query;
  const filter: Record<string, unknown> = {};

  if (category) filter.category = category;
  if (status) filter.status = status;

  const addons = await Addon.find(filter).sort({ category: 1, name: 1 });
  res.json(addons);
});

// GET /api/addons/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const addon = await Addon.findById(req.params.id);
  if (!addon) {
    res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    return;
  }
  res.json(addon);
});

// POST /api/addons — Chỉ Admin
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, price, status, category, description } = req.body;

  if (!name || price == null || !category) {
    res.status(400).json({ message: 'Thiếu thông tin bắt buộc: name, price, category' });
    return;
  }

  const addon = await Addon.create({ name, price, status, category, description });
  res.status(201).json(addon);
});

// PUT /api/addons/:id — Chỉ Admin
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, price, status, category, description } = req.body;

  const addon = await Addon.findByIdAndUpdate(
    req.params.id,
    { name, price, status, category, description },
    { new: true, runValidators: true }
  );

  if (!addon) {
    res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    return;
  }
  res.json(addon);
});

// DELETE /api/addons/:id — Chỉ Admin
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const addon = await Addon.findByIdAndDelete(req.params.id);
  if (!addon) {
    res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    return;
  }
  res.json({ message: 'Đã xóa sản phẩm thành công' });
});

export default router;
