import { AccessToken } from 'livekit-server-sdk';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { redis } from '../../lib/redis.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { db } from '../../lib/db/index.js';
import { messages } from '../../lib/db/schema.js';
import { WebSocketEvent } from '@zktalk/shared';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';

// Redis key for voice participants: hash of { [userId]: JSON({ displayName, joinedAt }) }
const voiceKey = (channelId: string) => `voice:channel:${channelId}`;
// Redis key for call start time
const callStartKey = (channelId: string) => `voice:callstart:${channelId}`;

// ── Token Generation ────────────────────────────────────────────────

export async function generateVoiceToken(
  channelId: string,
  userId: string,
  displayName: string,
): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new AppError(500, 'LIVEKIT_NOT_CONFIGURED', 'LiveKit is not configured');
  }

  const roomName = `channel-${channelId}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: userId,
    name: displayName,
    ttl: '4h',
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

// ── Participant Tracking ────────────────────────────────────────────

export async function joinVoiceChannel(
  channelId: string,
  userId: string,
  displayName: string,
): Promise<{ token: string; roomName: string; participants: VoiceParticipant[] }> {
  const token = await generateVoiceToken(channelId, userId, displayName);
  const roomName = `channel-${channelId}`;

  const key = voiceKey(channelId);
  const existing = await redis.hlen(key);

  // If this is the first participant, record call start time
  if (existing === 0) {
    await redis.set(callStartKey(channelId), Date.now().toString());
  }

  // Add participant to Redis hash
  await redis.hset(key, userId, JSON.stringify({ displayName, joinedAt: new Date().toISOString() }));
  // Set TTL of 5h (beyond max call duration) to auto-cleanup stale data
  await redis.expire(key, 18000);

  // Broadcast join event
  realtimeService.broadcastToChannel(
    channelId,
    WebSocketEvent.VOICE_USER_JOINED,
    { userId, displayName, channelId },
  );

  const participants = await getVoiceParticipants(channelId);

  return { token, roomName, participants };
}

export async function leaveVoiceChannel(
  channelId: string,
  userId: string,
  communityId?: string,
): Promise<void> {
  const key = voiceKey(channelId);

  // Get this user's info before removing
  const userDataRaw = await redis.hget(key, userId);
  if (!userDataRaw) return; // Not in the call

  const userData = JSON.parse(userDataRaw) as { displayName: string; joinedAt: string };

  // Remove participant
  await redis.hdel(key, userId);

  // Broadcast leave event
  realtimeService.broadcastToChannel(
    channelId,
    WebSocketEvent.VOICE_USER_LEFT,
    { userId, displayName: userData.displayName, channelId },
  );

  // Check if call is now empty
  const remaining = await redis.hlen(key);
  if (remaining === 0 && communityId) {
    // Save call history as system message
    await saveCallHistory(channelId, communityId, userId);
  }
}

export interface VoiceParticipant {
  userId: string;
  displayName: string;
  joinedAt: string;
}

export async function getVoiceParticipants(channelId: string): Promise<VoiceParticipant[]> {
  const key = voiceKey(channelId);
  const all = await redis.hgetall(key);

  return Object.entries(all).map(([odUserId, raw]) => {
    const data = JSON.parse(raw) as { displayName: string; joinedAt: string };
    return { userId: odUserId, displayName: data.displayName, joinedAt: data.joinedAt };
  });
}

// ── Call History ─────────────────────────────────────────────────────

async function saveCallHistory(
  channelId: string,
  communityId: string,
  lastUserId: string,
): Promise<void> {
  try {
    // Get call start time
    const startTimeRaw = await redis.get(callStartKey(channelId));
    if (!startTimeRaw) return;

    const startTime = parseInt(startTimeRaw, 10);
    const durationMs = Date.now() - startTime;
    const durationSeconds = Math.floor(durationMs / 1000);

    // Format duration
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = minutes > 0
      ? `${minutes}분 ${seconds}초`
      : `${seconds}초`;

    const bodyMarkdown = `📞 음성 통화가 종료되었습니다 (${durationStr})`;

    // Create system message
    const id = uuidv7();
    await db.insert(messages).values({
      id,
      communityId,
      channelId,
      authorUserId: lastUserId,
      bodyMarkdown,
      bodyPlaintext: bodyMarkdown,
      messageType: 'system',
    });

    // Broadcast the new system message
    realtimeService.broadcastToChannel(
      channelId,
      WebSocketEvent.MESSAGE_CREATED,
      {
        id,
        communityId,
        channelId,
        authorUserId: lastUserId,
        bodyMarkdown,
        bodyPlaintext: bodyMarkdown,
        messageType: 'system',
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      },
    );

    // Cleanup
    await redis.del(callStartKey(channelId));
  } catch (err) {
    console.error('[Voice] Failed to save call history:', (err as Error).message);
  }
}
