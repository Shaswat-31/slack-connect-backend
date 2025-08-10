import { Router } from 'express';
import { slackCallback, slackConnect } from '../controllers/slack.controller';
import { requireAuth } from '../middlewares/auth';


const router = Router();
router.use(requireAuth);
router.get('/connect', slackConnect);
router.get('/callback', slackCallback);

export default router;