import { describe, expect, it } from 'vitest';
import en from '../locales/en';
import ko from '../locales/ko';

describe('web locales', () => {
  it('keeps English and Korean locale keys synchronized', () => {
    const enKeys = Object.keys(en).sort();
    const koKeys = Object.keys(ko).sort();

    expect(koKeys).toEqual(enKeys);
  });

  it('includes localized copy for the composer hardening surfaces', () => {
    const requiredKeys = [
      'attachment.statusUploading',
      'attachment.statusUploaded',
      'attachment.statusFailed',
      'attachment.statusReady',
      'composer.emptyAiInput',
      'composer.topicMessageCount',
      'composer.longFormMode',
      'composer.longFormHint',
      'ai.applySuccess',
      'ai.summaryLoaded',
      'ai.dismissSummary',
      'ai.working',
      'ai.summaryMenuAction',
      'ai.replySuggestion',
      'ai.translateToEnglish',
      'ai.rewrite',
    ] as const satisfies ReadonlyArray<keyof typeof en>;

    for (const key of requiredKeys) {
      expect(en[key]).toBeTypeOf('string');
      expect(en[key]).not.toHaveLength(0);
      expect(ko[key]).toBeTypeOf('string');
      expect(ko[key]).not.toHaveLength(0);
    }
  });
});
