import { Router, Response } from 'express';
import User from '../models/User';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

// GET /api/users
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const users = await User.find().select('-password').sort({ createdAt: 1 });
  res.json(users);
});

// POST /api/users — Admin tạo tài khoản nhân viên
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ message: 'Thiếu thông tin bắt buộc: email, password, name' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    res.status(409).json({ message: `Email "${email}" đã được đăng ký` });
    return;
  }

  const user = await User.create({
    email: email.toLowerCase().trim(),
    password,
    name,
    role: role === 'admin' ? 'admin' : 'staff',
  });

  res.status(201).json(user);
});

// PUT /api/users/:id
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, role, isActive } = req.body;

  if (req.user!._id.toString() === req.params.id && isActive === false) {
    res.status(400).json({ message: 'Không thể vô hiệu hóa tài khoản của chính mình' });
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, role, isActive },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    res.status(404).json({ message: 'Không tìm thấy người dùng' });
    return;
  }
  res.json(user);
});

// PUT /api/users/:id/password
router.put('/:id/password', async (req: AuthRequest, res: Response): Promise<void> => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    return;
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404).json({ message: 'Không tìm thấy người dùng' });
    return;
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Đã đổi mật khẩu thành công' });
});

// DELETE /api/users/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!._id.toString() === req.params.id) {
    res.status(400).json({ message: 'Không thể xóa tài khoản của chính mình' });
    return;
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404).json({ message: 'Không tìm thấy người dùng' });
    return;
  }
  res.json({ message: `Đã xóa tài khoản "${user.email}"` });
});

export default router;
