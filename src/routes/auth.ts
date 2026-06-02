import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu' });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

  if (!user || !user.isActive) {
    res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    return;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    return;
  }

  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    secret,
    { expiresIn } as jwt.SignOptions
  );

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile — tự cập nhật tên hiển thị
router.put('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ message: 'Tên không được để trống' });
    return;
  }
  const user = await User.findByIdAndUpdate(
    req.user!._id,
    { name: name.trim() },
    { new: true }
  ).select('-password');
  res.json({ user });
});

// PUT /api/auth/password — tự đổi mật khẩu (cần nhập mật khẩu cũ)
router.put('/password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'Vui lòng nhập đủ mật khẩu cũ và mật khẩu mới' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    return;
  }
  const user = await User.findById(req.user!._id).select('+password');
  if (!user) { res.status(404).json({ message: 'Không tìm thấy người dùng' }); return; }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
    return;
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Đổi mật khẩu thành công' });
});

export default router;
