import { describe, expect, it } from 'vitest';
import {
  getOptimizedImageSrc,
  resolveImageRenderProps,
  shouldUseUnoptimizedImage,
} from '../image-optimization';

describe('image-optimization', () => {
  it('rewrites first-party asset URLs to the same-origin public asset proxy', () => {
    expect(getOptimizedImageSrc('/api/upload/assets/users/user-1/avatar.png')).toBe(
      '/api/public-assets/users/user-1/avatar.png',
    );

    expect(
      getOptimizedImageSrc(
        'http://127.0.0.1:4000/api/upload/assets/communities/community-1/icon.png',
      ),
    ).toBe('/api/public-assets/communities/community-1/icon.png');

    expect(
      getOptimizedImageSrc(
        'http://localhost:4000/api/upload/assets/communities/community-1/icon.png',
      ),
    ).toBe('/api/public-assets/communities/community-1/icon.png');

    expect(
      getOptimizedImageSrc(
        'https://desktop.zk.local:4010/api/upload/assets/users/user-1/avatar.png?v=20260401',
      ),
    ).toBe('/api/public-assets/users/user-1/avatar.png?v=20260401');
  });

  it('keeps non-asset URLs unchanged', () => {
    expect(getOptimizedImageSrc('https://example.com/avatar.png')).toBe(
      'https://example.com/avatar.png',
    );
    expect(getOptimizedImageSrc('/api/upload/attachments/attachment-1/file')).toBe(
      '/api/upload/attachments/attachment-1/file',
    );
  });

  it('marks only first-party upload and proxy URLs as optimizable', () => {
    expect(shouldUseUnoptimizedImage('/api/public-assets/users/user-1/avatar.png')).toBe(false);
    expect(
      shouldUseUnoptimizedImage(
        'http://127.0.0.1:4000/api/upload/assets/communities/community-1/icon.png',
      ),
    ).toBe(false);
    expect(
      shouldUseUnoptimizedImage(
        'https://desktop.zk.local:4010/api/upload/assets/users/user-1/avatar.png?v=20260401',
      ),
    ).toBe(false);

    expect(shouldUseUnoptimizedImage('https://example.com/avatar.png')).toBe(true);
    expect(shouldUseUnoptimizedImage('/api/upload/attachments/attachment-1/file')).toBe(true);
    expect(shouldUseUnoptimizedImage(null)).toBe(true);
  });

  it('resolves image render props in one step', () => {
    expect(
      resolveImageRenderProps(
        'http://127.0.0.1:4000/api/upload/assets/users/user-1/avatar.png',
        '2026-04-01T00:00:00.000Z',
      ),
    ).toEqual({
      src: '/api/public-assets/users/user-1/avatar.png?v=2026-04-01T00%3A00%3A00.000Z',
      unoptimized: false,
    });

    expect(resolveImageRenderProps('https://example.com/avatar.png', 'v2')).toEqual({
      src: 'https://example.com/avatar.png?v=v2',
      unoptimized: true,
    });
  });
});
