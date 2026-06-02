import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  role: string;
}

// Xác thực token JWT
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Không có token xác thực' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ message: 'Cấu hình server lỗi' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Tài khoản không hợp lệ hoặc đã bị vô hiệu hóa' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

// Chỉ cho phép Admin
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ message: 'Chỉ Admin mới có quyền thực hiện thao tác này' });
    return;
  }
  next();
}

// Cho phép cả Admin và Staff
export function requireStaff(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'staff') {
    res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
    return;
  }
  next();
}
