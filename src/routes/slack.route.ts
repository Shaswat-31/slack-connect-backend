import { Router } from 'express';
import { deleteScheduledMessages, getChannels, getMessages, getMessagesForParticularChannel, joinChannel, sendMessage, sendScheduledMessages, slackCallback, slackConnect } from '../controllers/slack.controller';
import { requireAuth } from '../middlewares/auth';


const router = Router();
// router.use(requireAuth);
router.get('/connect',requireAuth, slackConnect);
router.get('/callback', slackCallback);
router.get("/message/db",requireAuth,getMessages)
router.get("/messages/db/:channelId", requireAuth, getMessagesForParticularChannel);
router.get('/channels',requireAuth,getChannels);
router.post('/join',requireAuth,joinChannel);
router.post('/message',requireAuth,sendMessage);
router.post('/schedule/message',requireAuth,sendScheduledMessages);
router.delete('/schedule/deleteMessages',requireAuth,deleteScheduledMessages);

export default router;