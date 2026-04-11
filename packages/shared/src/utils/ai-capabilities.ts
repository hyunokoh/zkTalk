export type AiCapabilityId =
  | 'rail-assistant'
  | 'composer-reply-suggestion'
  | 'composer-translate-english'
  | 'composer-rewrite'
  | 'selected-message-reply-draft'
  | 'selected-message-rewrite-draft'
  | 'selected-message-translate-inline'
  | 'channel-summary';

export type AiPlatform = 'web' | 'desktop' | 'mobile';

const AI_CAPABILITIES_BY_PLATFORM: Record<AiPlatform, AiCapabilityId[]> = {
  web: [
    'rail-assistant',
    'composer-reply-suggestion',
    'composer-translate-english',
    'composer-rewrite',
    'selected-message-reply-draft',
    'selected-message-rewrite-draft',
    'selected-message-translate-inline',
    'channel-summary',
  ],
  desktop: [
    'rail-assistant',
    'composer-reply-suggestion',
    'composer-translate-english',
    'composer-rewrite',
    'selected-message-reply-draft',
    'selected-message-rewrite-draft',
    'selected-message-translate-inline',
    'channel-summary',
  ],
  mobile: [
    'selected-message-reply-draft',
    'selected-message-rewrite-draft',
    'selected-message-translate-inline',
  ],
};

export function listAiCapabilities(platform: AiPlatform): AiCapabilityId[] {
  return AI_CAPABILITIES_BY_PLATFORM[platform];
}

export function hasAiCapability(platform: AiPlatform, capability: AiCapabilityId): boolean {
  return AI_CAPABILITIES_BY_PLATFORM[platform].includes(capability);
}
