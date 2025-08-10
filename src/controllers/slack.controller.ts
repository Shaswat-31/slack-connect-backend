import { Request, Response } from 'express';
import prisma from '../utils/db';
import axios from 'axios';

export const slackCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const userId = req.user?.id; // pass state param in step 1 if you want to know which user

  if(!userId){
    return res.status(500).json({ error: 'OAuth failed because user id missing' });
  }
  try {
    const tokenRes = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL}/api/slack/callback`,
      },
    });

    if (!tokenRes.data.ok) {
      return res.status(400).json({ error: tokenRes.data.error });
    }

    const { access_token, refresh_token, scope, bot_user_id, team } = tokenRes.data;
    const slack=await prisma.user.findUnique({
      where:{
        id:userId
      },
      include:{
        slack:true
      }
    });
    await prisma.slackIntegration.update({
      where: { id: slack?.id },
      data: {
          accessToken: access_token,
          refreshToken: refresh_token || null,
          scope,
          botUserId: bot_user_id,
          teamId: team.id,
          teamName: team.name,
      },
    });

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OAuth failed' });
  }
};

export const slackConnect=async(req:Request, res:Response) => {
  console.log("slack connect");
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = encodeURIComponent(`${process.env.BACKEND_URL}/api/slack/callback`);
  const scope = encodeURIComponent('channels:read chat:write');

  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
  const anUrl='https://slack.com/oauth/v2/authorize?client_id=339171545393.9352700732976&scope=chat:write,channels:read,groups:read,channels:join&redirect_uri=https://oauth.pstmn.io/v1/callback'
  res.json({ redirectUrl: url });
}