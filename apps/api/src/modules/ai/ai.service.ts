import { eq, desc, and, isNull, gt, or } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { messages, users } from '../../lib/db/schema.js';
import { AppError } from '../../lib/errors.js';
import { isProductionEnv } from '../../lib/env.js';

interface MessageForSummary {
  author: string;
  body: string;
  createdAt: Date;
}

async function fetchRecentMessages(
  channelId: string,
  messageCount: number,
): Promise<MessageForSummary[]> {
  const rows = await db
    .select({
      body: messages.bodyPlaintext,
      createdAt: messages.createdAt,
      authorName: users.displayName,
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorUserId, users.id))
    .where(
      and(
        eq(messages.channelId, channelId),
        eq(messages.isDeleted, false),
        or(isNull(messages.expiresAt), gt(messages.expiresAt, new Date())),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(messageCount);

  return rows.reverse().map((r) => ({
    author: r.authorName,
    body: r.body,
    createdAt: r.createdAt,
  }));
}

function buildPrompt(msgs: MessageForSummary[]): string {
  const conversation = msgs
    .map((m) => `[${m.author}]: ${m.body}`)
    .join('\n');

  return `Summarize the following chat conversation concisely. Identify the main topics discussed, any decisions made, and any action items. Keep the summary brief (3-5 bullet points).

Conversation:
${conversation}

Summary:`;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function toOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

function isLoopbackOrigin(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '0.0.0.0'
      || hostname === '::1';
  } catch {
    return false;
  }
}

function toPublicOrigin(value: string | undefined): string | undefined {
  const origin = toOrigin(value);
  if (!origin || isLoopbackOrigin(origin)) {
    return undefined;
  }

  return origin;
}

export function getOpenRouterSiteUrl(): string | undefined {
  const configuredCorsOrigin = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .map((origin) => toPublicOrigin(origin))
    .find(Boolean);

  return (
    toPublicOrigin(process.env.OPENROUTER_SITE_URL)
    ?? toPublicOrigin(process.env.ZKTALK_PUBLIC_APP_URL)
    ?? toPublicOrigin(configuredCorsOrigin)
  );
}

type AIProvider = 'openrouter' | 'anthropic' | 'gemini' | 'mock';

export interface AIRuntimeSummary {
  provider: AIProvider | 'unset';
  status: 'configured' | 'mock' | 'disabled' | 'misconfigured';
  keyEnvVar?: 'OPENROUTER_API_KEY' | 'AI_API_KEY' | 'GEMINI_API_KEY';
  siteUrl?: string;
  issue?: string;
}

export function getConfiguredAIProvider(): AIProvider | undefined {
  const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (configuredProvider) {
    if (
      configuredProvider === 'openrouter'
      || configuredProvider === 'anthropic'
      || configuredProvider === 'gemini'
      || configuredProvider === 'mock'
    ) {
      return configuredProvider;
    }

    throw new Error('AI_PROVIDER must be one of: openrouter, anthropic, gemini, mock');
  }

  return undefined;
}

function getProviderKeyEnvVar(
  provider: Exclude<AIProvider, 'mock'>,
): 'OPENROUTER_API_KEY' | 'AI_API_KEY' | 'GEMINI_API_KEY' {
  switch (provider) {
    case 'openrouter':
      return 'OPENROUTER_API_KEY';
    case 'anthropic':
      return 'AI_API_KEY';
    case 'gemini':
      return 'GEMINI_API_KEY';
  }
}

export function getAIRuntimeSummary(): AIRuntimeSummary {
  const provider = getConfiguredAIProvider();

  if (!provider) {
    return isProductionEnv()
      ? {
          provider: 'unset',
          status: 'disabled',
          issue: 'Set AI_PROVIDER and the matching provider API key to enable AI routes.',
        }
      : {
          provider: 'unset',
          status: 'mock',
          issue: 'Development runtime will use the built-in mock AI response until AI_PROVIDER is configured.',
        };
  }

  if (provider === 'mock') {
    return {
      provider,
      status: 'mock',
      issue: 'AI_PROVIDER=mock returns local mock responses and should not be treated as production-ready AI.',
    };
  }

  const keyEnvVar = getProviderKeyEnvVar(provider);
  const configuredKey = process.env[keyEnvVar]?.trim();

  if (!configuredKey) {
    return {
      provider,
      status: 'misconfigured',
      keyEnvVar,
      issue: `${keyEnvVar} must be set when AI_PROVIDER=${provider}`,
      ...(provider === 'openrouter' && getOpenRouterSiteUrl()
        ? { siteUrl: getOpenRouterSiteUrl() }
        : {}),
    };
  }

  return {
    provider,
    status: 'configured',
    keyEnvVar,
    ...(provider === 'openrouter' && getOpenRouterSiteUrl()
      ? { siteUrl: getOpenRouterSiteUrl() }
      : {}),
  };
}

function assertAIRuntimeAvailable() {
  const runtime = getAIRuntimeSummary();

  if (runtime.status === 'misconfigured' || runtime.status === 'disabled') {
    throw AppError.badRequest(runtime.issue ?? 'AI runtime is not configured.');
  }
}

async function callGemini(content: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return '';

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: content }],
      },
    ],
  };

  if (systemInstruction) {
    (payload as Record<string, unknown>).systemInstruction = {
      role: 'system',
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) return '';

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export function getOpenRouterKey(): string {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  return '';
}

async function callAI(prompt: string, systemInstruction?: string): Promise<string> {
  const provider = getConfiguredAIProvider();

  if (provider === 'openrouter') {
    const openRouterKey = getOpenRouterKey();
    try {
      const openRouterSiteUrl = getOpenRouterSiteUrl();
      const messages = systemInstruction
        ? [
            { role: 'system' as const, content: systemInstruction },
            { role: 'user' as const, content: prompt },
          ]
        : [{ role: 'user' as const, content: prompt }];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'X-Title': 'zkTalk',
      };

      if (openRouterSiteUrl) {
        headers['HTTP-Referer'] = openRouterSiteUrl;
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'qwen/qwen3.6-plus:free',
          messages,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply;
      }
    } catch {
      // Fall through
    }
  }

  if (provider === 'gemini') {
    return callGemini(prompt, systemInstruction);
  }

  const apiKey = process.env.AI_API_KEY;

  if (provider === 'mock' || (!provider && !isProductionEnv())) {
    // Development-only mock summary to keep local UI flows usable without a provider account.
    return `**Channel Summary (Mock)**

- Various topics were discussed by channel members
- Key points and decisions were shared
- Action items were identified for follow-up
- Members engaged in productive conversation

_Note: Set AI_PROVIDER plus the matching provider key env var for real AI summaries._`;
  }

  if (provider === 'anthropic' && apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { content?: Array<{ text?: string }> };
        return data.content?.[0]?.text ?? 'Unable to generate summary.';
      }
    } catch {
      return '';
    }
  }

  return '';
}

export async function summarizeChannel(
  channelId: string,
  messageCount = 50,
): Promise<{ summary: string }> {
  assertAIRuntimeAvailable();
  const msgs = await fetchRecentMessages(channelId, messageCount);

  if (msgs.length < 3) {
    throw AppError.badRequest('Not enough messages to summarize');
  }

  const prompt = buildPrompt(msgs);
  const systemInstruction = 'You are a helpful assistant. Summarize the following chat conversation concisely. Identify the main topics discussed, any decisions made, and any action items. Keep the summary brief (3-5 bullet points). Respond in the same language as the conversation.';
  const summary = await callAI(prompt, systemInstruction);

  if (!summary) {
    throw AppError.badRequest('AI service is not available. Please check AI provider configuration.');
  }

  return { summary };
}

export async function chatWithAI(
  messages: ChatMessage[],
): Promise<{ reply: string }> {
  assertAIRuntimeAvailable();
  // Build conversation context for Gemini
  const systemMsg = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const systemInstruction = systemMsg?.content
    ?? 'You are a helpful AI assistant integrated into zkTalk, a community messenger app. Be concise and friendly. Respond in the same language the user speaks.';

  // Build a single prompt from the conversation
  const contentParts = conversationMessages.map(m => {
    const roleLabel = m.role === 'user' ? 'User' : 'Assistant';
    return `${roleLabel}: ${m.content}`;
  }).join('\n\n');

  const reply = await callAI(contentParts, systemInstruction);

  if (!reply) {
    throw AppError.badRequest('AI service is not available. Please check API key configuration.');
  }

  return { reply };
}
