import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import authRoutes from './routes/auth.route';
import slackRoutes from './routes/slack.route';
import { requireAuth } from './middlewares/auth';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/slack', slackRoutes);

app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ ok: true, user: (req as any).user });
});

app.get('/', (req, res) => {
  res.send("backend running");
});

// Export the app for Vercel
export default app;
