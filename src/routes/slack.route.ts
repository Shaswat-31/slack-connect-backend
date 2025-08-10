import { Router } from 'express';
import { getChannels, joinChannel, sendMessage, slackCallback, slackConnect } from '../controllers/slack.controller';
import { requireAuth } from '../middlewares/auth';


const router = Router();
// router.use(requireAuth);
router.get('/connect',requireAuth, slackConnect);
router.get('/callback', slackCallback);
router.get('/channels',requireAuth,getChannels);
router.post('/join',requireAuth,joinChannel);
router.post('/message',requireAuth,sendMessage);
export default router;