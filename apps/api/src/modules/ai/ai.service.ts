import { eq, desc, and, isNull, gt, or } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { messages, users } from '../../lib/db/schema.js';
import { AppError } from '../../lib/errors.js';

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

async function callAI(prompt: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    // Mock summary for dev
    return `**Channel Summary (Mock)**

- Various topics were discussed by channel members
- Key points and decisions were shared
- Action items were identified for follow-up
- Members engaged in productive conversation

_Note: Set AI_API_KEY env var for real AI summaries._`;
  }

  // Try Anthropic API first (Claude)
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
    // Fall through to OpenAI
  }

  // Try OpenAI
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? 'Unable to generate summary.';
    }
  } catch {
    // Fall through
  }

  return 'Unable to generate summary. Check your AI_API_KEY configuration.';
}

export async function summarizeChannel(
  channelId: string,
  messageCount = 50,
): Promise<{ summary: string }> {
  const msgs = await fetchRecentMessages(channelId, messageCount);

  if (msgs.length < 3) {
    throw AppError.badRequest('Not enough messages to summarize');
  }

  const prompt = buildPrompt(msgs);
  const summary = await callAI(prompt);

  return { summary };
}
