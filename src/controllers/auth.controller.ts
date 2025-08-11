import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';


export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, confirmPassword } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    if (!(password===confirmPassword)) return res.status(400).json({ error: 'Both password fields should match' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await argon2.hash(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    return res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { slack: true }, // include slack relation
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await argon2.verify(user.password, password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const slackAccessToken = user.slack?.accessToken || null;
    console.log(slackAccessToken);
    // sign JWT with slack token included
    const token = jwt.sign(
      { 
        sub: user.id, 
        email: user.email, 
        name:user.name,
        slackAccessToken, 
      }, 
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    return res.json({ accessToken: token,slackAccessToken, name:user.name, tokenType: 'Bearer', expiresIn: 3600 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

