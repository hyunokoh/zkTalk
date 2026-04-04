import { AppError } from '../../lib/errors.js';

export async function translateText(
  text: string,
  targetLang: string,
): Promise<{ translatedText: string }> {
  const apiKey = process.env.TRANSLATION_API_KEY;

  if (!apiKey) {
    // Mock translation for dev
    return {
      translatedText: `[${targetLang}] ${text}`,
    };
  }

  // Try Google Translate API
  try {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          format: 'text',
        }),
      },
    );

    if (res.ok) {
      const data = (await res.json()) as { data?: { translations?: Array<{ translatedText?: string }> } };
      const translated = data.data?.translations?.[0]?.translatedText;
      if (translated) {
        return { translatedText: translated };
      }
    }
  } catch {
    // Fall through
  }

  // Fallback: use AI_API_KEY with Anthropic for translation
  const aiKey = process.env.AI_API_KEY;
  if (aiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `Translate the following text to ${targetLang}. Only output the translated text, nothing else.\n\n${text}`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { content?: Array<{ text?: string }> };
        const translated = data.content?.[0]?.text;
        if (translated) {
          return { translatedText: translated };
        }
      }
    } catch {
      // Fall through
    }
  }

  throw AppError.badRequest('Translation failed. Check API key configuration.');
}
