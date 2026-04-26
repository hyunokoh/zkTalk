/**
 * Minimal Telegram Bot API client. We use only sendMessage outbound and
 * setWebhook for the inbound flow — both are plain HTTPS calls, no SDK.
 *
 * Bot API docs: https://core.telegram.org/bots/api
 */

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramSendOk {
  ok: true;
  result: { message_id: number };
}

interface TelegramErr {
  ok: false;
  description: string;
  error_code?: number;
}

export interface TelegramSendResult {
  externalMessageId: string;
}

async function call<T>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as TelegramSendOk | TelegramErr | T;
  if (typeof json === 'object' && json !== null && 'ok' in json && json.ok === false) {
    const err = json as TelegramErr;
    throw new Error(`Telegram ${method} failed: ${err.description}`);
  }
  return json as T;
}

export async function sendTelegramMessage(opts: {
  botToken: string;
  chatId: string;
  text: string;
}): Promise<TelegramSendResult> {
  const res = await call<TelegramSendOk>(opts.botToken, 'sendMessage', {
    chat_id: opts.chatId,
    text: opts.text,
    disable_web_page_preview: true,
  });
  return { externalMessageId: String(res.result.message_id) };
}

export async function setTelegramWebhook(opts: {
  botToken: string;
  url: string;
  secretToken?: string;
}): Promise<void> {
  await call<TelegramSendOk>(opts.botToken, 'setWebhook', {
    url: opts.url,
    ...(opts.secretToken ? { secret_token: opts.secretToken } : {}),
    allowed_updates: ['message', 'channel_post'],
    drop_pending_updates: true,
  });
}

export async function deleteTelegramWebhook(opts: { botToken: string }): Promise<void> {
  await call<TelegramSendOk>(opts.botToken, 'deleteWebhook', {});
}

export async function getTelegramMe(botToken: string): Promise<{
  username: string;
  firstName: string;
}> {
  const res = await call<{
    ok: true;
    result: { username: string; first_name: string };
  }>(botToken, 'getMe', {});
  return { username: res.result.username, firstName: res.result.first_name };
}

// Minimal shape of a Telegram update we care about — everything else is ignored.
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramIncomingMessage;
  channel_post?: TelegramIncomingMessage;
}

export interface TelegramIncomingMessage {
  message_id: number;
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  sender_chat?: { id: number; title?: string };
  chat: { id: number };
  text?: string;
  caption?: string;
}

export function readableAuthor(msg: TelegramIncomingMessage): string {
  if (msg.from) {
    const first = msg.from.first_name ?? '';
    const last = msg.from.last_name ?? '';
    const full = `${first} ${last}`.trim();
    return full || msg.from.username || `tg:${msg.from.id}`;
  }
  if (msg.sender_chat) {
    return msg.sender_chat.title || `tg:${msg.sender_chat.id}`;
  }
  return 'Telegram';
}
