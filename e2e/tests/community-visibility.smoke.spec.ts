import { expect, test, type APIRequestContext } from '@playwright/test';
import { getSeedData } from '../utils/seed';

const apiBaseUrl =
  process.env.ZKTALK_BASE_URL ?? `http://127.0.0.1:${process.env.ZKTALK_API_PORT ?? '4000'}`;

type Visibility = 'public' | 'invite_only' | 'private';

interface CommunityPayload {
  community: {
    id: string;
    slug: string;
    name: string;
    visibility: Visibility;
  };
}

interface RolePayload {
  roles: Array<{ id: string; name: string }>;
}

interface CreatedChannelPayload {
  id: string;
  name: string;
  accessPolicy: 'public' | 'members_only' | 'invite_only' | 'private';
}

interface MessagePayload {
  id: string;
  bodyMarkdown: string;
  bodyPlaintext: string;
}

interface ChannelMessagesPayload {
  messages: Array<{ message: MessagePayload }>;
}

interface UserSettingsPayload {
  settings: {
    lastVisited: null | {
      kind: 'community' | 'channel' | 'thread' | 'dm';
      communityId?: string;
      channelId?: string;
      threadId?: string;
      conversationId?: string;
    };
  };
}

interface ChannelRow {
  id: string;
  name: string;
  accessPolicy: 'public' | 'members_only' | 'invite_only' | 'private';
  canView?: boolean;
  lockedReason?: 'join_required' | 'invite_required';
}

interface ChannelPayload {
  uncategorized: ChannelRow[];
  categories: Array<{ channels: ChannelRow[] }>;
}

async function authedJson<T>(
  request: APIRequestContext,
  path: string,
  token: string,
  options?: {
    method?: 'GET' | 'POST';
    data?: unknown;
    expectedStatus?: number;
  },
): Promise<{ status: number; body: T }> {
  const response = await request.fetch(`${apiBaseUrl}${path}`, {
    method: options?.method ?? 'GET',
    failOnStatusCode: false,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    data: options?.data,
  });

  expect(response.status(), `${path} status`).toBe(options?.expectedStatus ?? 200);
  return {
    status: response.status(),
    body: (await response.json()) as T,
  };
}

function flattenChannels(payload: ChannelPayload) {
  return [
    ...(payload.uncategorized ?? []),
    ...(payload.categories ?? []).flatMap((category) => category.channels ?? []),
  ];
}

test.describe('community visibility smoke', () => {
  test('covers anonymous discovery, public browse, locked-channel denial, private-community denial, and post-join unlock', async ({
    request,
  }) => {
    const seed = await getSeedData();
    const suffix = `${Date.now()}`;

    const publicCommunity = await authedJson<CommunityPayload>(request, '/api/communities', seed.userA.sessionToken, {
      method: 'POST',
      expectedStatus: 201,
      data: {
        name: `Visibility Public ${suffix}`,
        slug: `visibility-public-${suffix}`,
        visibility: 'public',
        description: 'Public discovery smoke community',
      },
    });

    const privateCommunity = await authedJson<CommunityPayload>(request, '/api/communities', seed.userA.sessionToken, {
      method: 'POST',
      expectedStatus: 201,
      data: {
        name: `Visibility Private ${suffix}`,
        slug: `visibility-private-${suffix}`,
        visibility: 'private',
        description: 'Private discovery smoke community',
      },
    });

    const roles = await authedJson<RolePayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/roles`,
      seed.userA.sessionToken,
    );
    const ownerRole = roles.body.roles.find((role) => role.name === 'owner');
    expect(ownerRole).toBeTruthy();

    const publicChannel = await authedJson<CreatedChannelPayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/channels`,
      seed.userA.sessionToken,
      {
        method: 'POST',
        expectedStatus: 201,
        data: {
          name: `news-${suffix}`,
          type: 'chat',
          accessPolicy: 'public',
        },
      },
    );

    const inviteOnlyChannel = await authedJson<CreatedChannelPayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/channels`,
      seed.userA.sessionToken,
      {
        method: 'POST',
        expectedStatus: 201,
        data: {
          name: `mods-${suffix}`,
          type: 'chat',
          accessPolicy: 'invite_only',
          allowedViewRoleIds: [ownerRole!.id],
        },
      },
    );

    const membersOnlyChannel = await authedJson<CreatedChannelPayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/channels`,
      seed.userA.sessionToken,
      {
        method: 'POST',
        expectedStatus: 201,
        data: {
          name: `members-${suffix}`,
          type: 'chat',
          accessPolicy: 'members_only',
        },
      },
    );

    const publicMessage = await authedJson<{ id: string }>(
      request,
      `/api/channels/${publicChannel.body.id}/messages`,
      seed.userA.sessionToken,
      {
        method: 'POST',
        expectedStatus: 201,
        data: {
          bodyMarkdown: `public-preview-${suffix}`,
        },
      },
    );

    const membersOnlyMessage = await authedJson<{ id: string }>(
      request,
      `/api/channels/${membersOnlyChannel.body.id}/messages`,
      seed.userA.sessionToken,
      {
        method: 'POST',
        expectedStatus: 201,
        data: {
          bodyMarkdown: `members-only-${suffix}`,
        },
      },
    );

    await authedJson<CreatedChannelPayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/channels`,
      seed.userA.sessionToken,
      {
        method: 'POST',
        expectedStatus: 201,
        data: {
          name: `leadership-${suffix}`,
          type: 'chat',
          accessPolicy: 'private',
          allowedViewRoleIds: [ownerRole!.id],
        },
      },
    );

    const publicChannelAccess = await request.get(
      `${apiBaseUrl}/api/channels/${publicChannel.body.id}`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(publicChannelAccess.status()).toBe(200);

    const lockedChannelAccess = await request.get(
      `${apiBaseUrl}/api/channels/${membersOnlyChannel.body.id}`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(lockedChannelAccess.status()).toBe(403);

    const publicMessagesBeforeJoin = await authedJson<ChannelMessagesPayload>(
      request,
      `/api/channels/${publicChannel.body.id}/messages?limit=20`,
      seed.userB.sessionToken,
    );
    expect(
      publicMessagesBeforeJoin.body.messages.some(
        (row) => row.message.id === publicMessage.body.id,
      ),
    ).toBe(true);

    const lockedMessagesBeforeJoin = await request.get(
      `${apiBaseUrl}/api/channels/${membersOnlyChannel.body.id}/messages?limit=20`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(lockedMessagesBeforeJoin.status()).toBe(403);

    const lockedMessageFetchBeforeJoin = await request.get(
      `${apiBaseUrl}/api/messages/${membersOnlyMessage.body.id}`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(lockedMessageFetchBeforeJoin.status()).toBe(403);

    const anonymousDiscover = await request.get(
      `${apiBaseUrl}/api/discover?q=${encodeURIComponent(`Visibility ${suffix}`)}`,
      { failOnStatusCode: false },
    );
    expect(anonymousDiscover.status()).toBe(200);
    const discoverBody = (await anonymousDiscover.json()) as {
      communities: Array<{ slug: string }>;
    };
    expect(discoverBody.communities.map((community) => community.slug)).toContain(
      publicCommunity.body.community.slug,
    );
    expect(discoverBody.communities.map((community) => community.slug)).not.toContain(
      privateCommunity.body.community.slug,
    );

    const nonMemberBrowse = await authedJson<ChannelPayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/channels`,
      seed.userB.sessionToken,
    );
    const nonMemberChannels = flattenChannels(nonMemberBrowse.body);

    expect(nonMemberChannels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: `news-${suffix}`,
          accessPolicy: 'public',
          canView: true,
        }),
        expect.objectContaining({
          name: `members-${suffix}`,
          accessPolicy: 'members_only',
          canView: false,
          lockedReason: 'join_required',
        }),
        expect.objectContaining({
          name: `mods-${suffix}`,
          accessPolicy: 'invite_only',
          canView: false,
          lockedReason: 'invite_required',
        }),
      ]),
    );
    expect(nonMemberChannels.find((channel) => channel.name === `leadership-${suffix}`)).toBeFalsy();

    const privateBrowse = await request.get(
      `${apiBaseUrl}/api/communities/${privateCommunity.body.community.id}/channels`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(privateBrowse.status()).toBe(403);

    await authedJson(
      request,
      `/api/communities/${publicCommunity.body.community.slug}/join`,
      seed.userB.sessionToken,
      {
        method: 'POST',
      },
    );

    const memberBrowse = await authedJson<ChannelPayload>(
      request,
      `/api/communities/${publicCommunity.body.community.id}/channels`,
      seed.userB.sessionToken,
    );
    const memberChannels = flattenChannels(memberBrowse.body);
    expect(memberChannels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: `members-${suffix}`,
          accessPolicy: 'members_only',
          canView: true,
        }),
      ]),
    );
    expect(
      memberChannels.find((channel) => channel.name === `members-${suffix}`)?.lockedReason,
    ).toBeUndefined();
    expect(
      memberChannels.find((channel) => channel.name === `mods-${suffix}`),
    ).toBeFalsy();

    const unlockedChannelAccess = await request.get(
      `${apiBaseUrl}/api/channels/${membersOnlyChannel.body.id}`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(unlockedChannelAccess.status()).toBe(200);

    const unlockedMessagesAfterJoin = await authedJson<ChannelMessagesPayload>(
      request,
      `/api/channels/${membersOnlyChannel.body.id}/messages?limit=20`,
      seed.userB.sessionToken,
    );
    expect(
      unlockedMessagesAfterJoin.body.messages.some(
        (row) => row.message.id === membersOnlyMessage.body.id,
      ),
    ).toBe(true);

    const inviteOnlyAccessAfterJoin = await request.get(
      `${apiBaseUrl}/api/channels/${inviteOnlyChannel.body.id}`,
      {
        failOnStatusCode: false,
        headers: {
          Authorization: `Bearer ${seed.userB.sessionToken}`,
        },
      },
    );
    expect(inviteOnlyAccessAfterJoin.status()).toBe(403);

    const settingsAfterProtectedVisit = await authedJson<UserSettingsPayload>(
      request,
      '/api/me/settings',
      seed.userB.sessionToken,
      {
        method: 'PATCH',
        data: {
          lastVisited: {
            kind: 'channel',
            communityId: publicCommunity.body.community.id,
            channelId: membersOnlyChannel.body.id,
          },
        },
      },
    );
    expect(settingsAfterProtectedVisit.body.settings.lastVisited).toMatchObject({
      kind: 'channel',
      communityId: publicCommunity.body.community.id,
      channelId: membersOnlyChannel.body.id,
    });

    await authedJson(
      request,
      `/api/communities/${publicCommunity.body.community.id}/leave`,
      seed.userB.sessionToken,
      {
        method: 'POST',
      },
    );

    const settingsAfterLeave = await authedJson<UserSettingsPayload>(
      request,
      '/api/me/settings',
      seed.userB.sessionToken,
    );
    expect(settingsAfterLeave.body.settings.lastVisited).toBeNull();
  });
});
