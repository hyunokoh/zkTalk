import { describe, it, expect } from 'vitest';
import { MagicLinkRequestSchema, CreateCommunitySchema, CreateMessageSchema } from '../validators/index.js';

describe('MagicLinkRequestSchema', () => {
  it('accepts valid email', () => {
    const result = MagicLinkRequestSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = MagicLinkRequestSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('CreateCommunitySchema', () => {
  it('accepts valid community', () => {
    const result = CreateCommunitySchema.safeParse({
      name: 'My Community',
      slug: 'my-community',
    });
    expect(result.success).toBe(true);
  });

  it('rejects slug with uppercase', () => {
    const result = CreateCommunitySchema.safeParse({
      name: 'Test',
      slug: 'InvalidSlug',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateMessageSchema', () => {
  it('accepts valid message', () => {
    const result = CreateMessageSchema.safeParse({ bodyMarkdown: 'Hello world' });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = CreateMessageSchema.safeParse({ bodyMarkdown: '' });
    expect(result.success).toBe(false);
  });
});
