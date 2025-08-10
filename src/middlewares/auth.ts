import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    console.log(payload);
    req.user = payload;
    req.user.id=payload.sub
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};