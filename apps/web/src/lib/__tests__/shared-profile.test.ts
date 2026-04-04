import { describe, expect, it } from 'vitest';
import { buildSharedProfileHref, parseSharedProfileText } from '../shared-profile';

describe('shared-profile', () => {
  it('parses a zktalk deep link from shared text', () => {
    const profile = parseSharedProfileText(
      '홍길동님의 zkTalk 프로필을 추가해 보세요: zktalk://user/user-123?displayName=홍길동&username=gildong',
    );

    expect(profile).toEqual({
      userId: 'user-123',
      displayName: '홍길동',
      username: 'gildong',
    });
  });

  it('builds a friends route with profile params', () => {
    const href = buildSharedProfileHref({
      userId: 'user-123',
      displayName: 'Jane',
      username: 'jane',
    });

    expect(href).toBe('/friends?profileUserId=user-123&displayName=Jane&username=jane');
  });
});
