export type SlugFeedback = 'idle' | 'auto' | 'converted' | 'invalid' | 'needsManual';

export type CommunitySlugState = {
  slugInput: string,
  slug: string,
  slugFeedback: SlugFeedback,
  isWarning: boolean,
};

export function slugifyCommunitySlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function getAutoCommunitySlugFeedback(source: string, generatedSlug: string): SlugFeedback {
  if (!source.trim()) {
    return 'idle';
  }

  return generatedSlug ? 'auto' : 'needsManual';
}

export function getManualCommunitySlugFeedback(input: string, sanitizedSlug: string): SlugFeedback {
  if (!input.trim()) {
    return 'idle';
  }

  if (!sanitizedSlug) {
    return 'invalid';
  }

  return sanitizedSlug === input ? 'idle' : 'converted';
}

export function getManualCommunitySlugState(input: string): CommunitySlugState {
  const slug = slugifyCommunitySlug(input);
  const slugFeedback = getManualCommunitySlugFeedback(input, slug);

  return {
    slugInput: input,
    slug,
    slugFeedback,
    isWarning: isCommunitySlugWarning(slugFeedback),
  };
}

export function getAutoCommunitySlugState(source: string): CommunitySlugState {
  const slug = slugifyCommunitySlug(source);
  const slugFeedback = getAutoCommunitySlugFeedback(source, slug);

  return {
    slugInput: slug,
    slug,
    slugFeedback,
    isWarning: isCommunitySlugWarning(slugFeedback),
  };
}

export function isCommunitySlugWarning(slugFeedback: SlugFeedback): boolean {
  return slugFeedback === 'invalid' || slugFeedback === 'needsManual';
}

export function resolveCommunitySlugForSubmit(name: string, currentSlug: string): string {
  return currentSlug || slugifyCommunitySlug(name);
}

export function canSubmitCommunitySlug(name: string, currentSlug: string): boolean {
  return Boolean(name.trim()) && Boolean(resolveCommunitySlugForSubmit(name, currentSlug));
}
