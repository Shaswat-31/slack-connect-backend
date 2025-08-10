import { Request, Response } from 'express';
import prisma from '../utils/db';
import axios from 'axios';

export const slackCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  const userId = decodeURIComponent(state);
  if (!userId) {
    return res.status(400).json({ error: 'OAuth failed because user id missing' });
  }

  try {
    const tokenRes = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        redirect_uri: process.env.SLACK_REDIRECT_URI, 
      },
    });

    if (!tokenRes.data.ok) {
      return res.status(400).json({ error: tokenRes.data.error });
    }
    console.log(tokenRes);
    const { access_token, refresh_token, scope, bot_user_id, team, authed_user } = tokenRes.data;

    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token || null,
        scope,
        botUserId: bot_user_id,
        teamId: team.id,
        teamName: team.name,
        userAccessToken:authed_user.access_token
      },
      create: {
        userId,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        scope,
        botUserId: bot_user_id,
        teamId: team.id,
        teamName: team.name,
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?redirected=${true}`);
  } catch (err) {
    console.error('Slack OAuth Error:', err);
    res.status(500).json({ error: 'OAuth failed' });
  }
};


export const slackConnect=async(req:Request, res:Response) => {
  console.log("slack connect");
  const clientId = process.env.SLACK_CLIENT_ID;
   const userId = req.user?.id; 
    const state = encodeURIComponent(userId as string);
  const redirectUri = `${process.env.SLACK_REDIRECT_URI}`;
  const scope = 'channels:read chat:write channels:join groups:read';
  const userScopes=[
  "channels:read",       // user can read channel info
  "chat:write",          // user can send messages as themselves
  "groups:read",         // user can read private channels info
  "im:read",             // user can read direct messages
  "mpim:read",           // user can read multi-party DMs
  "users:read",          // read user profile info
  "users:read.email",    // read user email address
  // Add any other user scopes your app requires
].join(",");
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&user_scope=${userScopes}&redirect_uri=${redirectUri}&state=${state}`;
  //const anUrl='https://slack.com/oauth/v2/authorize?client_id=339171545393.9352700732976&scope=chat:write,channels:read,groups:read,channels:join&redirect_uri=https://oauth.pstmn.io/v1/callback'
  res.json({ redirectUrl: url });
}

const SLACK_API_BASE = "https://slack.com/api";

async function getUserSlackToken(userId: string) {
  const slackIntegration = await prisma.slackIntegration.findUnique({
    where: { userId },
  });
  if (!slackIntegration) {
    throw new Error("Slack integration not found for user");
  }

  const { accessToken, refreshToken } = slackIntegration;
  try {
    const authTestRes = await axios.get("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (authTestRes.data.ok) {
      return accessToken;
    } else {
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }
      const tokenRefreshRes = await axios.post(
        "https://slack.com/api/oauth.v2.access",
        null,
        {
          params: {
            grant_type: "refresh_token",
            client_id: process.env.SLACK_CLIENT_ID,
            client_secret: process.env.SLACK_CLIENT_SECRET,
            refresh_token: refreshToken,
          },
        }
      );

      if (!tokenRefreshRes.data.ok) {
        throw new Error("Failed to refresh Slack token: " + tokenRefreshRes.data.error);
      }

      // Update DB with new access token and refresh token (if returned)
      const newAccessToken = tokenRefreshRes.data.access_token;
      const newRefreshToken = tokenRefreshRes.data.refresh_token || refreshToken;

      await prisma.slackIntegration.update({
        where: { userId },
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });

      return newAccessToken;
    }
  } catch (err) {
    throw new Error("Error validating or refreshing Slack token: " + err);
  }
}

// 1. Get Slack Channels
export const getChannels = async (req: Request, res: Response) => {
  try {
    console.log('getting channels')
    const userId = req.user?.id;
    console.log(userId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const token = await getUserSlackToken(userId);

    const response = await axios.get(`${SLACK_API_BASE}/conversations.list`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        types: "public_channel,private_channel",
        limit: 100,
      },
    });

    if (!response.data.ok) {
      return res.status(400).json({ error: response.data.error });
    }

    res.json(response.data.channels);
  } catch (error: any) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// 2. Join a Slack Channel
export const joinChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!channelId) return res.status(400).json({ error: "channelId required" });

    const token = await getUserSlackToken(userId);

    const response = await axios.post(
      `${SLACK_API_BASE}/conversations.join`,
      { channel: channelId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.ok) {
      return res.status(400).json({ error: response.data.error });
    }

    res.json({ message: `Joined channel ${channelId}` });
  } catch (error: any) {
    console.error("Error joining channel:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

// 3. Send a Message to Slack Channel
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { channelId, text } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!channelId || !text)
      return res.status(400).json({ error: "channelId and text required" });

    const token = await getUserSlackToken(userId);

    const response = await axios.post(
      `${SLACK_API_BASE}/chat.postMessage`,
      {
        channel: channelId,
        text,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.ok) {
      return res.status(400).json({ error: response.data.error });
    }

    res.json({ message: "Message sent", ts: response.data.ts });
  } catch (error: any) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

export const sendScheduledMessages=async (req: Request, res: Response) => {
  const { channelId, message, postAt } = req.body;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const slackToken = await getUserSlackToken(userId);

  if (!slackToken || !channelId || !message || !postAt) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const slackRes = await axios.post(
      "https://slack.com/api/chat.scheduleMessage",
      {
        channel: channelId,
        text: message,
        post_at: postAt,
      },
      {
        headers: { Authorization: `Bearer ${slackToken}` },
      }
    );

    if (!slackRes.data.ok) {
      return res.status(400).json({ error: slackRes.data.error });
    }

    // Save slackRes.data.scheduled_message_id and other info in your DB here

    return res.json({ scheduledMessageId: slackRes.data.scheduled_message_id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};
 export const deleteScheduledMessages=async (req: Request, res: Response) => {
  const { channelId, scheduledMessageId } = req.body;
   const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const slackToken = await getUserSlackToken(userId);

  if (!slackToken || !channelId || !scheduledMessageId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const slackRes = await axios.post(
      "https://slack.com/api/chat.deleteScheduledMessage",
      {
        channel: channelId,
        scheduled_message_id: scheduledMessageId,
      },
      {
        headers: { Authorization: `Bearer ${slackToken}` },
      }
    );

    if (!slackRes.data.ok) {
      return res.status(400).json({ error: slackRes.data.error });
    }

    // Update your DB to mark message as canceled

    return res.json({ message: "Scheduled message canceled" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}