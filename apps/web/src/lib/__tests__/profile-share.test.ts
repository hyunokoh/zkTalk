import { describe, expect, it } from 'vitest';
import { buildProfileDeepLink, buildProfileWebLink } from '../profile-share';

describe('profile-share', () => {
  it('builds a deep link with display name and username params', () => {
    expect(
      buildProfileDeepLink({
        userId: 'user-123',
        displayName: 'Jane Doe',
        username: 'jane',
      }),
    ).toBe('zktalk://user/user-123?displayName=Jane+Doe&username=jane');
  });

  it('builds a same-origin web profile link', () => {
    expect(buildProfileWebLink('http://127.0.0.1:3000/', 'user-123')).toBe(
      'http://127.0.0.1:3000/user/user-123',
    );
  });
});
