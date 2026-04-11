import { isProductionEnv } from '../../lib/env.js';

export type TranslationRuntimeStatus = 'available' | 'mock' | 'disabled' | 'unavailable';
export type TranslationRuntimeProvider = 'google-translate' | 'anthropic' | 'mock' | 'unset';

export interface TranslationRuntimeSummary {
  status: TranslationRuntimeStatus;
  provider: TranslationRuntimeProvider;
  issue?: string;
}

export interface TranslateTextResult {
  translatedText: string | null;
  runtime: TranslationRuntimeSummary;
}

function getDisabledTranslationResult(): TranslateTextResult {
  if (isProductionEnv()) {
    return {
      translatedText: null,
      runtime: {
        status: 'disabled',
        provider: 'unset',
        issue:
          'Translation runtime is disabled. Set TRANSLATION_API_KEY or AI_API_KEY to enable provider-backed translation.',
      },
    };
  }

  return {
    translatedText: null,
    runtime: {
      status: 'mock',
      provider: 'mock',
      issue:
        'Translation is using the local mock runtime because no provider key is configured.',
    },
  };
}

export async function translateText(
  text: string,
  targetLang: string,
): Promise<TranslateTextResult> {
  const apiKey = process.env.TRANSLATION_API_KEY;
  const aiKey = process.env.AI_API_KEY;

  // Try Google Translate API
  if (apiKey) {
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
        const data = (await res.json()) as {
          data?: { translations?: Array<{ translatedText?: string }> };
        };
        const translated = data.data?.translations?.[0]?.translatedText;
        if (translated) {
          return {
            translatedText: translated,
            runtime: {
              status: 'available',
              provider: 'google-translate',
            },
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  // Fallback: use AI_API_KEY with Anthropic for translation
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
          return {
            translatedText: translated,
            runtime: {
              status: 'available',
              provider: 'anthropic',
            },
          };
        }
      }
    } catch {
      // Fall through
    }
  }

  if (!apiKey && !aiKey) {
    const disabledResult = getDisabledTranslationResult();
    if (disabledResult.runtime.status === 'mock') {
      return {
        translatedText: `[${targetLang}] ${text}`,
        runtime: disabledResult.runtime,
      };
    }

    return disabledResult;
  }

  return {
    translatedText: null,
    runtime: {
      status: 'unavailable',
      provider: apiKey ? 'google-translate' : 'anthropic',
      issue:
        'Translation provider request failed. Check configured credentials and outbound network access.',
    },
  };
}
