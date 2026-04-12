import crypto from 'node:crypto';
import { WebSocket } from 'ws';

const baseUrl = process.env.ZKTALK_BASE_URL ?? 'http://127.0.0.1:4000';
const includeTokens =
  process.argv.includes('--include-tokens') || process.env.ZKTALK_E2E_INCLUDE_TOKENS === '1';

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

async function request(path, { method = 'GET', token, body, headers } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      `${method} ${path} failed: ${response.status} ${response.statusText}\n${JSON.stringify(json, null, 2)}`,
    );
  }

  return json;
}

async function requestExpectFailure(
  path,
  { method = 'GET', token, body, headers, expectedStatus } = {},
) {
  try {
    await request(path, { method, token, body, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (expectedStatus && !message.includes(`${expectedStatus}`)) {
      throw error;
    }
    return message;
  }

  throw new Error(`${method} ${path} unexpectedly succeeded`);
}

async function uploadBinary(path, { token, contentType, body }) {
  const targetUrl = /^https?:\/\//i.test(path) ? path : `${baseUrl}${path}`;
  const isAbsoluteStorageUrl = /^https?:\/\//i.test(path);
  const response = await fetch(targetUrl, {
    method: 'PUT',
    headers: {
      ...(!isAbsoluteStorageUrl && token ? { authorization: `Bearer ${token}` } : {}),
      ...(contentType ? { 'content-type': contentType } : {}),
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PUT ${path} failed: ${response.status} ${response.statusText}\n${text}`);
  }
}

async function loginByEmail(email) {
  const requestResult = await request('/api/auth/magic-link/request', {
    method: 'POST',
    body: { email },
  });

  if (!requestResult?.token) {
    throw new Error(`Magic link token missing for ${email}`);
  }

  const verifyResult = await request('/api/auth/magic-link/verify', {
    method: 'POST',
    body: { token: requestResult.token },
  });

  const sessionToken = verifyResult?.sessionToken;
  if (!sessionToken) {
    throw new Error(`sessionToken missing for ${email}`);
  }

  const meResult = await request('/api/me', { token: sessionToken });
  return {
    token: sessionToken,
    user: meResult.user,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function connectWebSocket(token) {
  const wsBase = baseUrl.replace(/^http/, 'ws');
  const socket = new WebSocket(`${wsBase}/api/ws?token=${encodeURIComponent(token)}`);

  await new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      socket.off('open', onOpen);
      socket.off('error', onError);
    };

    socket.on('open', onOpen);
    socket.on('error', onError);
  });

  return socket;
}

async function waitForWsEvent(
  socket,
  predicate,
  { timeoutMs = 5000, label = 'websocket event' } = {},
) {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${label}`));
    }, timeoutMs);

    const onMessage = (raw) => {
      try {
        const parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf-8'));
        if (!predicate(parsed)) {
          return;
        }
        cleanup();
        resolve(parsed);
      } catch {
        // Ignore malformed frames during the wait window.
      }
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('message', onMessage);
      socket.off('error', onError);
    };

    socket.on('message', onMessage);
    socket.on('error', onError);
  });
}

async function waitFor(check, { attempts = 5, delayMs = 150, label = 'condition' } = {}) {
  let lastValue = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastValue = await check();
    if (lastValue) {
      return lastValue;
    }
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function findMessage(messages, id) {
  return messages.find((entry) => entry.message?.id === id || entry.messageId === id || entry.id === id);
}

function pickMessageList(result) {
  return result.items ?? result.messages ?? [];
}

function pickId(result) {
  return result?.id ?? result?.message?.id ?? result?.thread?.id ?? result?.conversation?.id ?? null;
}

function pickBody(result) {
  return result?.bodyMarkdown ?? result?.message?.bodyMarkdown ?? null;
}

async function main() {
  const seed = String(Date.now()).slice(-8);
  const openSockets = [];
  const userA = await loginByEmail(`qa-a-${seed}@example.com`);
  const userB = await loginByEmail(`qa-b-${seed}@example.com`);
  const userC = await loginByEmail(`qa-c-${seed}@example.com`);

  const communitySlug = uniqueId('qa');
  const communityName = `QA ${communitySlug}`;
  const channelName = uniqueId('chat');
  const forumName = uniqueId('forum');
  const voiceChannelName = uniqueId('voice');

  const createdCommunity = await request('/api/communities', {
    method: 'POST',
    token: userA.token,
    body: {
      name: communityName,
      slug: communitySlug,
      description: 'Two-user messaging QA',
      visibility: 'public',
    },
  });
  const communityId = createdCommunity.community.id;

  const createdChannel = await request(`/api/communities/${communityId}/channels`, {
    method: 'POST',
    token: userA.token,
    body: {
      name: channelName,
      description: 'QA channel',
      type: 'chat',
      visibility: 'public',
      slowModeSeconds: 0,
      requireTopic: false,
    },
  });
  const channelId = createdChannel.id;

  const createdForumChannel = await request(`/api/communities/${communityId}/channels`, {
    method: 'POST',
    token: userA.token,
    body: {
      name: forumName,
      description: 'QA forum channel',
      type: 'forum',
      visibility: 'public',
      slowModeSeconds: 0,
      requireTopic: false,
    },
  });
  const forumChannelId = createdForumChannel.id;

  await request(`/api/communities/${communityId}/channels`, {
    method: 'POST',
    token: userA.token,
    body: {
      name: voiceChannelName,
      description: 'QA voice channel',
      type: 'voice',
      visibility: 'public',
      slowModeSeconds: 0,
      requireTopic: false,
    },
  });

  await request(`/api/communities/${communityId}/join`, {
    method: 'POST',
    token: userB.token,
  });

  await request(`/api/communities/${communityId}/join`, {
    method: 'POST',
    token: userC.token,
  });

  const channelMessageText = uniqueId('channel-msg');
  const channelMessage = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': uniqueId('req') },
    body: { bodyMarkdown: channelMessageText },
  });
  const channelMessageId = pickId(channelMessage);
  assert(channelMessageId, 'Channel message id missing from create response');

  const channelMessages = await request(`/api/channels/${channelId}/messages?limit=20`, {
    token: userB.token,
  });
  assert(findMessage(pickMessageList(channelMessages), channelMessageId), 'User B could not see channel message from User A');

  const initialUnreadState = await request(`/api/channels/${channelId}/messages?limit=20`, {
    token: userA.token,
  });
  assert(
    initialUnreadState.unreadCounts?.[channelMessageId] === 2,
    `Channel unread people count should start at 2, received ${initialUnreadState.unreadCounts?.[channelMessageId]}`,
  );

  const userBUnreadSummaryBeforeRead = await request(`/api/communities/${communityId}/unread`, {
    token: userB.token,
  });
  const userBChannelUnreadBeforeRead = userBUnreadSummaryBeforeRead.find(
    (entry) => entry.channelId === channelId,
  );
  assert(
    userBChannelUnreadBeforeRead?.unreadCount === 1,
    `User B channel unread summary should start at 1, received ${userBChannelUnreadBeforeRead?.unreadCount}`,
  );

  const userCUnreadSummaryBeforeRead = await request(`/api/communities/${communityId}/unread`, {
    token: userC.token,
  });
  const userCChannelUnreadBeforeRead = userCUnreadSummaryBeforeRead.find(
    (entry) => entry.channelId === channelId,
  );
  assert(
    userCChannelUnreadBeforeRead?.unreadCount === 1,
    `User C channel unread summary should start at 1, received ${userCChannelUnreadBeforeRead?.unreadCount}`,
  );

  await request(`/api/channels/${channelId}/read`, {
    method: 'POST',
    token: userB.token,
    body: { lastMessageId: channelMessageId },
  });

  const unreadAfterUserBRead = await request(`/api/channels/${channelId}/messages?limit=20`, {
    token: userA.token,
  });
  assert(
    unreadAfterUserBRead.unreadCounts?.[channelMessageId] === 1,
    `Channel unread people count should drop to 1 after User B reads, received ${unreadAfterUserBRead.unreadCounts?.[channelMessageId]}`,
  );

  const userBUnreadSummaryAfterRead = await request(`/api/communities/${communityId}/unread`, {
    token: userB.token,
  });
  const userBChannelUnreadAfterRead = userBUnreadSummaryAfterRead.find(
    (entry) => entry.channelId === channelId,
  );
  assert(
    userBChannelUnreadAfterRead?.unreadCount === 0,
    `User B channel unread summary should drop to 0 after reading, received ${userBChannelUnreadAfterRead?.unreadCount}`,
  );

  await request(`/api/channels/${channelId}/read`, {
    method: 'POST',
    token: userC.token,
    body: { lastMessageId: channelMessageId },
  });

  const unreadAfterUserCRead = await request(`/api/channels/${channelId}/messages?limit=20`, {
    token: userA.token,
  });
  assert(
    unreadAfterUserCRead.unreadCounts?.[channelMessageId] === 0,
    `Channel unread people count should drop to 0 after User C reads, received ${unreadAfterUserCRead.unreadCounts?.[channelMessageId]}`,
  );

  const userCUnreadSummaryAfterRead = await request(`/api/communities/${communityId}/unread`, {
    token: userC.token,
  });
  const userCChannelUnreadAfterRead = userCUnreadSummaryAfterRead.find(
    (entry) => entry.channelId === channelId,
  );
  assert(
    userCChannelUnreadAfterRead?.unreadCount === 0,
    `User C channel unread summary should drop to 0 after reading, received ${userCChannelUnreadAfterRead?.unreadCount}`,
  );

  const channelIdempotencyBody = uniqueId('channel-idempotent');
  const channelRequestId = uniqueId('channel-req');
  const channelIdempotentFirst = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': channelRequestId },
    body: { bodyMarkdown: channelIdempotencyBody },
  });
  const channelIdempotentSecond = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': channelRequestId },
    body: { bodyMarkdown: channelIdempotencyBody },
  });
  const channelIdempotentMessageId = pickId(channelIdempotentFirst);
  assert(channelIdempotentMessageId, 'Channel idempotent message id missing from create response');
  assert(
    pickId(channelIdempotentSecond) === channelIdempotentMessageId,
    'Channel send did not return the existing message for the same request id',
  );

  const channelMessagesAfterIdempotentSend = await request(`/api/channels/${channelId}/messages?limit=20`, {
    token: userB.token,
  });
  const matchingChannelMessages = pickMessageList(channelMessagesAfterIdempotentSend).filter((entry) => {
    const message = entry.message ?? entry;
    return (
      message.bodyMarkdown === channelIdempotencyBody ||
      message.bodyPlaintext === channelIdempotencyBody
    );
  });
  assert(
    matchingChannelMessages.length === 1,
    `Channel idempotent send created ${matchingChannelMessages.length} matching messages instead of 1`,
  );

  const editedChannelText = `${channelMessageText}-edited`;
  const editedChannelMessage = await request(`/api/messages/${channelMessageId}`, {
    method: 'PATCH',
    token: userA.token,
    body: { bodyMarkdown: editedChannelText },
  });
  assert(
    pickBody(editedChannelMessage) === editedChannelText,
    'Channel edit did not persist',
  );

  const tempDeleteMessage = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': uniqueId('req') },
    body: { bodyMarkdown: uniqueId('channel-delete') },
  });
  const tempDeleteMessageId = pickId(tempDeleteMessage);
  assert(tempDeleteMessageId, 'Temporary channel message id missing from create response');
  await request(`/api/messages/${tempDeleteMessageId}`, {
    method: 'DELETE',
    token: userA.token,
  });
  const channelMessagesAfterDelete = await request(`/api/channels/${channelId}/messages?limit=20`, {
    token: userB.token,
  });
  const deletedChannelMessage = findMessage(pickMessageList(channelMessagesAfterDelete), tempDeleteMessageId);
  assert(
    deletedChannelMessage?.isDeleted || deletedChannelMessage?.message?.isDeleted,
    'Channel delete was not reflected to the recipient',
  );

  const mentionMessage = await request(`/api/channels/${channelId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': uniqueId('req') },
    body: { bodyMarkdown: `@everyone ${uniqueId('mention')}` },
  });
  const mentionMessageId = pickId(mentionMessage);
  assert(mentionMessageId, 'Mention message id missing from create response');

  const mentionInboxEntry = await waitFor(async () => {
    const inboxItems = await request('/api/inbox?limit=20&type=all', {
      token: userB.token,
    });
    return pickMessageList(inboxItems).find(
      (entry) => entry.message?.id === mentionMessageId || entry.messageId === mentionMessageId,
    );
  }, { attempts: 8, delayMs: 200, label: 'mention inbox entry' });
  assert(mentionInboxEntry, 'Mentioned channel message did not appear in User B inbox');

  const thread = await request(`/api/messages/${channelMessageId}/thread`, {
    method: 'POST',
    token: userA.token,
  });
  const threadId = pickId(thread);
  assert(threadId, 'Thread id missing from create-thread response');
  const threadReplyText = uniqueId('thread-reply');
  const threadReply = await request(`/api/threads/${threadId}/messages`, {
    method: 'POST',
    token: userB.token,
    body: { bodyMarkdown: threadReplyText },
  });
  const threadReplyId = pickId(threadReply);
  assert(threadReplyId, 'Thread reply id missing from post response');

  const threadMessages = await request(`/api/threads/${threadId}/messages?limit=20`, {
    token: userA.token,
  });
  assert(findMessage(pickMessageList(threadMessages), threadReplyId), 'User A could not see thread reply from User B');

  await request(`/api/threads/${threadId}/read`, {
    method: 'POST',
    token: userA.token,
    body: { messageId: threadReplyId },
  });

  const reactionEmoji = '👍';
  await request(`/api/messages/${channelMessageId}/reactions`, {
    method: 'POST',
    token: userB.token,
    body: { emoji: reactionEmoji },
  });
  const reactions = await request(`/api/messages/${channelMessageId}/reactions`, {
    token: userA.token,
  });
  assert(
    Array.isArray(reactions) &&
      reactions.some((reaction) => reaction.emoji === reactionEmoji && Array.isArray(reaction.users) && reaction.users.some((user) => user.id === userB.user.id)),
    'Reaction from User B was not visible to User A',
  );
  await request(`/api/messages/${channelMessageId}/reactions/${encodeURIComponent(reactionEmoji)}`, {
    method: 'DELETE',
    token: userB.token,
  });
  const reactionsAfterRemove = await request(`/api/messages/${channelMessageId}/reactions`, {
    token: userA.token,
  });
  assert(
    Array.isArray(reactionsAfterRemove) &&
      !reactionsAfterRemove.some((reaction) => reaction.emoji === reactionEmoji && Array.isArray(reaction.users) && reaction.users.some((user) => user.id === userB.user.id)),
    'Reaction removal from User B was not visible to User A',
  );

  const conversation = await request('/api/dm/conversations', {
    method: 'POST',
    token: userA.token,
    body: { targetUserId: userB.user.id },
  });
  const conversationId = pickId(conversation);
  assert(conversationId, 'DM conversation id missing from create response');

  const repeatedConversation = await request('/api/dm/conversations', {
    method: 'POST',
    token: userA.token,
    body: { targetUserId: userB.user.id },
  });
  assert(
    pickId(repeatedConversation) === conversationId,
    'Direct DM create did not return the existing conversation',
  );

  const dmIdempotencyBody = uniqueId('dm-idempotent');
  const dmRequestId = uniqueId('dm-req');
  const dmIdempotentFirst = await request(`/api/dm/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': dmRequestId },
    body: { bodyMarkdown: dmIdempotencyBody },
  });
  const dmIdempotentSecond = await request(`/api/dm/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': dmRequestId },
    body: { bodyMarkdown: dmIdempotencyBody },
  });
  const dmIdempotentMessageId = pickId(dmIdempotentFirst);
  assert(dmIdempotentMessageId, 'DM idempotent message id missing from create response');
  assert(
    pickId(dmIdempotentSecond) === dmIdempotentMessageId,
    'DM send did not return the existing message for the same request id',
  );
  const dmMessagesAfterIdempotentSend = await request(
    `/api/dm/conversations/${conversationId}/messages?limit=20`,
    {
      token: userB.token,
    },
  );
  const matchingDmMessages = pickMessageList(dmMessagesAfterIdempotentSend).filter((entry) => {
    const message = entry.message ?? entry;
    return (
      message.bodyMarkdown === dmIdempotencyBody ||
      message.bodyPlaintext === dmIdempotencyBody
    );
  });
  assert(
    matchingDmMessages.length === 1,
    `DM idempotent send created ${matchingDmMessages.length} matching messages instead of 1`,
  );

  const dmAttachmentMessage = await request(`/api/dm/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: userA.token,
    headers: { 'x-request-id': uniqueId('dm-attachment-msg') },
    body: { bodyMarkdown: uniqueId('dm-attachment-body') },
  });
  const dmAttachmentMessageId = pickId(dmAttachmentMessage);
  assert(dmAttachmentMessageId, 'DM attachment message id missing from create response');

  const dmAttachmentPresign = await request('/api/upload/presign', {
    method: 'POST',
    token: userA.token,
    body: {
      conversationId,
      fileName: 'dm-attachment.txt',
      mimeType: 'text/plain',
      fileSize: 20,
    },
  });
  assert(
    typeof dmAttachmentPresign.storageKey === 'string' &&
      dmAttachmentPresign.storageKey.includes(`uploads/dm/${conversationId}/`),
    'DM presign did not return a DM-scoped storage key',
  );

  await uploadBinary(dmAttachmentPresign.uploadUrl, {
    token: userA.token,
    contentType: 'text/plain',
    body: Buffer.from('dm attachment content'),
  });

  if (dmAttachmentPresign.uploadSessionId) {
    await request(`/api/upload/sessions/${dmAttachmentPresign.uploadSessionId}/complete`, {
      method: 'POST',
      token: userA.token,
      body: { parts: [] },
    });
  }

  const dmAttachment = await request('/api/upload/attachments', {
    method: 'POST',
    token: userA.token,
    body: {
      dmMessageId: dmAttachmentMessageId,
      uploadSessionId: dmAttachmentPresign.uploadSessionId,
      fileName: 'dm-attachment.txt',
      mimeType: 'text/plain',
      fileSize: 20,
    },
  });
  const dmAttachmentId = dmAttachment?.id;
  assert(dmAttachmentId, 'DM attachment id missing from create response');

  const dmMessagesAfterAttachment = await request(
    `/api/dm/conversations/${conversationId}/messages?limit=20`,
    {
      token: userB.token,
    },
  );
  const attachedDmMessage = findMessage(
    pickMessageList(dmMessagesAfterAttachment),
    dmAttachmentMessageId,
  );
  const attachedDmAttachments =
    attachedDmMessage?.attachments ??
    attachedDmMessage?.message?.attachments ??
    [];
  assert(
    Array.isArray(attachedDmAttachments) &&
      attachedDmAttachments.some((attachment) => attachment.id === dmAttachmentId),
    'DM attachment did not appear in the recipient message payload',
  );

  const dmAttachmentDownload = await fetch(
    `${baseUrl}/api/upload/attachments/${dmAttachmentId}/file`,
    {
      headers: {
        authorization: `Bearer ${userB.token}`,
      },
    },
  );
  assert(
    dmAttachmentDownload.ok &&
      (await dmAttachmentDownload.text()) === 'dm attachment content',
    'DM attachment file could not be downloaded by the recipient',
  );

  const groupConversation = await request('/api/dm/conversations/group', {
    method: 'POST',
    token: userA.token,
    body: { participantUserIds: [userB.user.id, userC.user.id], name: uniqueId('group-dm') },
  });
  const groupConversationId = pickId(groupConversation);
  assert(groupConversationId, 'Group DM conversation id missing from create response');

  const groupDmText = uniqueId('group-dm-msg');
  const groupDmMessage = await request(`/api/dm/conversations/${groupConversationId}/messages`, {
    method: 'POST',
    token: userA.token,
    body: { bodyMarkdown: groupDmText },
  });
  const groupDmMessageId = pickId(groupDmMessage);
  assert(groupDmMessageId, 'Group DM message id missing from create response');
  const groupDmMessages = await request(`/api/dm/conversations/${groupConversationId}/messages?limit=20`, {
    token: userC.token,
  });
  assert(
    findMessage(pickMessageList(groupDmMessages), groupDmMessageId),
    'User C could not see group DM message from User A',
  );
  await request(`/api/dm/conversations/${groupConversationId}/read`, {
    method: 'POST',
    token: userC.token,
    body: { messageId: groupDmMessageId },
  });
  const groupReadStatus = await request(`/api/dm/conversations/${groupConversationId}/read-status`, {
    token: userA.token,
  });
  assert(
    groupReadStatus.readStatus &&
      typeof groupReadStatus.readStatus === 'object' &&
      groupReadStatus.readStatus[userC.user.id] === groupDmMessageId,
    'Group DM read status did not reflect User C read receipt',
  );

  const userBWs = await connectWebSocket(userB.token);
  const userCWs = await connectWebSocket(userC.token);
  openSockets.push(userBWs, userCWs);
  const userBPromoteEventPromise = waitForWsEvent(
    userBWs,
    (event) =>
      event?.event === 'dm.conversation_updated' &&
      event?.conversationId === groupConversationId,
    { label: 'User B promotion websocket event' },
  );
  const userCPromoteEventPromise = waitForWsEvent(
    userCWs,
    (event) =>
      event?.event === 'dm.conversation_updated' &&
      event?.conversationId === groupConversationId,
    { label: 'User C promotion websocket event' },
  );

  const promotedConversation = await request(
    `/api/dm/conversations/${groupConversationId}/promote`,
    {
      method: 'POST',
      token: userA.token,
    },
  );
  const promotedCommunityId = promotedConversation.community?.id;
  const promotedCommunitySlug = promotedConversation.community?.slug;
  const promotedChannelId = promotedConversation.channel?.id;
  assert(promotedCommunityId, 'Promoted community id missing from DM promotion response');
  assert(promotedCommunitySlug, 'Promoted community slug missing from DM promotion response');
  assert(promotedChannelId, 'Promoted channel id missing from DM promotion response');
  assert(
    promotedConversation.importedMessageCount >= 1,
    'DM promotion did not report imported history',
  );
  assert(
    promotedConversation.alreadyPromoted === false,
    'First DM promotion should create a new community',
  );

  const [userBPromoteEvent, userCPromoteEvent] = await Promise.all([
    userBPromoteEventPromise,
    userCPromoteEventPromise,
  ]);
  assert(
    userBPromoteEvent?.data?.promotedCommunity?.id === promotedCommunityId &&
      userBPromoteEvent?.data?.promotedChannel?.id === promotedChannelId,
    'User B did not receive the promoted target over WebSocket',
  );
  assert(
    userCPromoteEvent?.data?.promotedCommunity?.id === promotedCommunityId &&
      userCPromoteEvent?.data?.promotedChannel?.id === promotedChannelId,
    'User C did not receive the promoted target over WebSocket',
  );

  const promotedCommunitiesForUserB = await request('/api/communities', {
    token: userB.token,
  });
  const promotedCommunitiesForUserC = await request('/api/communities', {
    token: userC.token,
  });
  assert(
    (promotedCommunitiesForUserB.communities ?? []).some((community) => community.id === promotedCommunityId),
    'Promoted community was not visible to User B',
  );
  assert(
    (promotedCommunitiesForUserC.communities ?? []).some((community) => community.id === promotedCommunityId),
    'Promoted community was not visible to User C',
  );

  const promotedMessages = await request(`/api/channels/${promotedChannelId}/messages?limit=20`, {
    token: userB.token,
  });
  const importedGroupDm = pickMessageList(promotedMessages).find((entry) => {
    const message = entry.message ?? entry;
    return message.bodyMarkdown === groupDmText || message.bodyPlaintext === groupDmText;
  });
  assert(importedGroupDm, 'Group DM history was not copied into the promoted community channel');
  const promotedChannelDetail = await request(`/api/channels/${promotedChannelId}`, {
    token: userB.token,
  });
  assert(
    promotedChannelDetail.channel?.sourceDmConversation?.id === groupConversationId,
    'Promoted channel detail did not include the source DM history target for User B',
  );
  assert(
    promotedChannelDetail.channel?.sourceDmConversation?.type === 'group',
    'Promoted group DM channel detail did not include the source DM type',
  );
  const promotedCommunityChannels = await request(`/api/communities/${promotedCommunityId}/channels`, {
    token: userB.token,
  });
  const promotedChannelRow =
    (promotedCommunityChannels.uncategorized ?? []).find((entry) => entry.id === promotedChannelId) ??
    (promotedCommunityChannels.categories ?? [])
      .flatMap((entry) => entry.channels ?? [])
      .find((entry) => entry.id === promotedChannelId);
  assert(
    promotedChannelRow?.sourceDmConversation?.id === groupConversationId &&
      promotedChannelRow?.sourceDmConversation?.type === 'group',
    'Promoted community channel list did not include the source DM metadata',
  );

  const promotedConversationAgain = await request(
    `/api/dm/conversations/${groupConversationId}/promote`,
    {
      method: 'POST',
      token: userA.token,
    },
  );
  assert(
    promotedConversationAgain.alreadyPromoted === true,
    'Second DM promotion should reuse the existing community',
  );
  assert(
    promotedConversationAgain.community?.id === promotedCommunityId &&
      promotedConversationAgain.channel?.id === promotedChannelId,
    'Second DM promotion did not return the original community target',
  );
  assert(
    promotedConversationAgain.importedMessageCount === 0,
    'Second DM promotion should not re-import history',
  );

  const promotedCallTarget = await request(
    `/api/dm/conversations/${groupConversationId}/call-target`,
    {
      method: 'POST',
      token: userA.token,
    },
  );
  const promotedVoiceChannelId = promotedCallTarget.voiceChannel?.id;
  assert(promotedVoiceChannelId, 'DM call target did not return a voice channel');
  assert(
    promotedCallTarget.community?.id === promotedCommunityId &&
      promotedCallTarget.channel?.id === promotedChannelId,
    'DM call target did not reuse the promoted community target',
  );

  const promotedVoiceParticipants = await request(
    `/api/channels/${promotedVoiceChannelId}/voice/participants`,
    {
      token: userB.token,
    },
  );
  assert(
    Array.isArray(promotedVoiceParticipants.participants),
    'Promoted DM voice channel did not expose participant state',
  );

  const promotedMessagesAfterRetry = await request(`/api/channels/${promotedChannelId}/messages?limit=20`, {
    token: userB.token,
  });
  const importedGroupDmCount = pickMessageList(promotedMessagesAfterRetry).filter((entry) => {
    const message = entry.message ?? entry;
    return message.bodyMarkdown === groupDmText || message.bodyPlaintext === groupDmText;
  }).length;
  assert(
    importedGroupDmCount === 1,
    'Second DM promotion duplicated imported history in the promoted community channel',
  );

  const promotedConversationsForUserB = await request('/api/dm/conversations', {
    token: userB.token,
  });
  const promotedConversationRowForUserB = (promotedConversationsForUserB.conversations ?? []).find(
    (entry) => entry.conversation?.id === groupConversationId,
  );
  assert(
    promotedConversationRowForUserB?.promotedCommunity?.id === promotedCommunityId,
    'DM list did not include the promoted community target for User B',
  );
  assert(
    promotedConversationRowForUserB?.promotedChannel?.id === promotedChannelId,
    'DM list did not include the promoted channel target for User B',
  );

  const promotedDmWriteFailure = await requestExpectFailure(
    `/api/dm/conversations/${groupConversationId}/messages`,
    {
      method: 'POST',
      token: userA.token,
      body: { bodyMarkdown: uniqueId('post-promote-dm') },
      expectedStatus: 409,
    },
  );
  assert(
    promotedDmWriteFailure.includes('DM_PROMOTED_READ_ONLY') ||
      promotedDmWriteFailure.includes('Continue in'),
    'Promoted DM did not reject new messages with the expected error',
  );

  const promotedFollowupText = uniqueId('promoted-followup');
  const promotedFollowup = await request(`/api/channels/${promotedChannelId}/messages`, {
    method: 'POST',
    token: userB.token,
    body: { bodyMarkdown: promotedFollowupText },
  });
  assert(pickId(promotedFollowup), 'Posting in the promoted community channel failed');

  const promotedMessagesForUserC = await request(`/api/channels/${promotedChannelId}/messages?limit=20`, {
    token: userC.token,
  });
  const promotedFollowupVisible = pickMessageList(promotedMessagesForUserC).find((entry) => {
    const message = entry.message ?? entry;
    return message.bodyMarkdown === promotedFollowupText || message.bodyPlaintext === promotedFollowupText;
  });
  assert(
    promotedFollowupVisible,
    'Promoted community channel was not usable by migrated participants',
  );

  const dmText = uniqueId('dm-msg');
  const dmMessage = await request(`/api/dm/conversations/${conversationId}/messages`, {
    method: 'POST',
    token: userA.token,
    body: { bodyMarkdown: dmText },
  });
  const dmMessageId = pickId(dmMessage);
  assert(dmMessageId, 'DM message id missing from create response');

  const dmMessages = await request(`/api/dm/conversations/${conversationId}/messages?limit=20`, {
    token: userB.token,
  });
  assert(findMessage(pickMessageList(dmMessages), dmMessageId), 'User B could not see DM from User A');

  await request(`/api/dm/conversations/${conversationId}/read`, {
    method: 'POST',
    token: userB.token,
    body: { messageId: dmMessageId },
  });
  const readStatus = await request(`/api/dm/conversations/${conversationId}/read-status`, {
    token: userA.token,
  });
  assert(
    readStatus.readStatus &&
      typeof readStatus.readStatus === 'object' &&
      readStatus.readStatus[userB.user.id] === dmMessageId,
    'DM read status did not reflect User B read receipt',
  );

  const editedText = `${dmText}-edited`;
  const editedDmMessage = await request(`/api/dm/messages/${dmMessageId}`, {
    method: 'PATCH',
    token: userA.token,
    body: { bodyMarkdown: editedText },
  });
  assert(
    pickBody(editedDmMessage) === editedText,
    'DM edit did not persist',
  );

  await request(`/api/dm/messages/${dmMessageId}`, {
    method: 'DELETE',
    token: userA.token,
  });
  const dmMessagesAfterDelete = await request(`/api/dm/conversations/${conversationId}/messages?limit=20`, {
    token: userB.token,
  });
  const deletedDm = findMessage(pickMessageList(dmMessagesAfterDelete), dmMessageId);
  assert(
    deletedDm?.isDeleted || deletedDm?.message?.isDeleted,
    'DM delete was not reflected to the recipient',
  );

  const directPromotedConversation = await request(
    `/api/dm/conversations/${conversationId}/promote`,
    {
      method: 'POST',
      token: userA.token,
    },
  );
  const directPromotedChannelId = directPromotedConversation.channel?.id;
  assert(directPromotedChannelId, 'Direct DM promotion did not return a channel id');
  const directPromotedChannelDetail = await request(`/api/channels/${directPromotedChannelId}`, {
    token: userA.token,
  });
  assert(
    directPromotedChannelDetail.channel?.sourceDmConversation?.id === conversationId,
    'Direct DM promoted channel did not point back to the source DM history',
  );
  assert(
    directPromotedChannelDetail.channel?.sourceDmConversation?.name === userB.user.displayName,
    'Direct DM promoted channel did not expose the expected peer display name for the source history',
  );
  assert(
    directPromotedChannelDetail.channel?.sourceDmConversation?.type === 'direct',
    'Direct DM promoted channel did not expose the expected source DM type',
  );

  const directDmCallTarget = await request(
    `/api/dm/conversations/${conversationId}/call-target`,
    {
      method: 'POST',
      token: userA.token,
    },
  );
  assert(
    directDmCallTarget.community?.id &&
      directDmCallTarget.channel?.id &&
      directDmCallTarget.voiceChannel?.id,
    'Direct DM call target did not return a promoted community, channel, and voice channel',
  );

  // Keep one writable direct DM alive for desktop/mobile harness regression runs.
  const harnessConversation = await request('/api/dm/conversations', {
    method: 'POST',
    token: userC.token,
    body: { targetUserId: userA.user.id },
  });
  const harnessConversationId = pickId(harnessConversation);
  assert(harnessConversationId, 'Harness DM conversation id missing from create response');

  const repeatedHarnessConversation = await request('/api/dm/conversations', {
    method: 'POST',
    token: userC.token,
    body: { targetUserId: userA.user.id },
  });
  assert(
    pickId(repeatedHarnessConversation) === harnessConversationId,
    'Harness DM create did not return the existing conversation',
  );

  const harnessMessageText = uniqueId('harness-dm');
  const harnessMessage = await request(`/api/dm/conversations/${harnessConversationId}/messages`, {
    method: 'POST',
    token: userC.token,
    body: { bodyMarkdown: harnessMessageText },
  });
  assert(pickId(harnessMessage), 'Harness DM message id missing from create response');

  const forumPost = await request(`/api/channels/${forumChannelId}/threads`, {
    method: 'POST',
    token: userA.token,
    body: {
      title: uniqueId('forum-post'),
      bodyMarkdown: uniqueId('forum-body'),
    },
  });
  const listedThreads = await request(`/api/channels/${forumChannelId}/threads?limit=20&sort=latest`, {
    token: userB.token,
  });
  assert(
    (listedThreads.items ?? []).some((entry) => entry.thread?.id === forumPost.thread.id),
    'Forum thread created by User A was not visible to User B',
  );

  const forwarded = await request(`/api/messages/${channelMessageId}/forward`, {
    method: 'POST',
    token: userA.token,
    body: { targetChannelId: channelId },
  });
  assert(pickId(forwarded), 'Forwarded message did not return an id');

  console.log(JSON.stringify({
    ok: true,
    users: [userA.user.id, userB.user.id, userC.user.id],
    ...(includeTokens
      ? {
          userA: {
            id: userA.user.id,
            email: `qa-a-${seed}@example.com`,
            displayName: userA.user.displayName,
            sessionToken: userA.token,
          },
          userB: {
            id: userB.user.id,
            email: `qa-b-${seed}@example.com`,
            displayName: userB.user.displayName,
            sessionToken: userB.token,
          },
          userC: {
            id: userC.user.id,
            email: `qa-c-${seed}@example.com`,
            displayName: userC.user.displayName,
            sessionToken: userC.token,
          },
          dmHarnessSender: {
            id: userC.user.id,
            email: `qa-c-${seed}@example.com`,
            displayName: userC.user.displayName,
            sessionToken: userC.token,
          },
          dmHarnessReceiver: {
            id: userA.user.id,
            email: `qa-a-${seed}@example.com`,
            displayName: userA.user.displayName,
            sessionToken: userA.token,
          },
        }
      : {}),
      communityId,
      communitySlug,
      communityName,
      channelId,
      channelName,
    forumChannelId,
    threadId,
    conversationId,
    directConversationId: conversationId,
    groupConversationId,
    harnessConversationId,
    harnessMessageText,
    dmHarnessSenderUserId: userC.user.id,
    dmHarnessReceiverUserId: userA.user.id,
    promotedCommunityId,
    promotedCommunitySlug,
    promotedChannelId,
    checks: [
      'channel-send',
      'channel-receive',
      'channel-send-idempotent',
      'channel-unread-people-count',
      'channel-unread-summary',
      'channel-edit',
      'channel-delete',
      'channel-mention-inbox',
      'thread-create',
      'thread-reply',
      'thread-read',
      'reaction-add',
      'reaction-remove',
      'dm-create',
      'dm-create-idempotent',
      'dm-send-idempotent',
      'dm-attachment',
      'direct-dm-call-target',
      'group-dm-create',
      'group-dm-send',
      'group-dm-read',
      'group-dm-promote-community',
      'group-dm-promote-history',
      'group-dm-source-history-target',
      'group-dm-source-history-list',
      'group-dm-promote-idempotent',
      'group-dm-call-target',
      'group-dm-promote-list-target',
      'group-dm-promote-ws-update',
      'group-dm-promote-read-only',
      'group-dm-promote-followup',
      'dm-send',
      'dm-read',
      'dm-edit',
      'dm-delete',
      'direct-dm-source-history-name',
      'harness-dm-create',
      'harness-dm-create-idempotent',
      'forum-create',
      'forum-list',
      'forward-message',
    ],
  }, null, 2));

  await Promise.all(
    openSockets.map(
      (socket) =>
        new Promise((resolve) => {
          socket.once('close', resolve);
          socket.close();
        }),
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
