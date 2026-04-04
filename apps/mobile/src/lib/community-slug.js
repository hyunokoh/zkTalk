"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyCommunitySlug = slugifyCommunitySlug;
exports.getAutoCommunitySlugFeedback = getAutoCommunitySlugFeedback;
exports.getManualCommunitySlugFeedback = getManualCommunitySlugFeedback;
exports.getManualCommunitySlugState = getManualCommunitySlugState;
exports.getAutoCommunitySlugState = getAutoCommunitySlugState;
exports.isCommunitySlugWarning = isCommunitySlugWarning;
exports.resolveCommunitySlugForSubmit = resolveCommunitySlugForSubmit;
exports.canSubmitCommunitySlug = canSubmitCommunitySlug;
function slugifyCommunitySlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
}
function getAutoCommunitySlugFeedback(source, generatedSlug) {
    if (!source.trim()) {
        return 'idle';
    }
    return generatedSlug ? 'auto' : 'needsManual';
}
function getManualCommunitySlugFeedback(input, sanitizedSlug) {
    if (!input.trim()) {
        return 'idle';
    }
    if (!sanitizedSlug) {
        return 'invalid';
    }
    return sanitizedSlug === input ? 'idle' : 'converted';
}
function getManualCommunitySlugState(input) {
    var slug = slugifyCommunitySlug(input);
    var slugFeedback = getManualCommunitySlugFeedback(input, slug);
    return {
        slugInput: input,
        slug: slug,
        slugFeedback: slugFeedback,
        isWarning: isCommunitySlugWarning(slugFeedback),
    };
}
function getAutoCommunitySlugState(source) {
    var slug = slugifyCommunitySlug(source);
    var slugFeedback = getAutoCommunitySlugFeedback(source, slug);
    return {
        slugInput: slug,
        slug: slug,
        slugFeedback: slugFeedback,
        isWarning: isCommunitySlugWarning(slugFeedback),
    };
}
function isCommunitySlugWarning(slugFeedback) {
    return slugFeedback === 'invalid' || slugFeedback === 'needsManual';
}
function resolveCommunitySlugForSubmit(name, currentSlug) {
    return currentSlug || slugifyCommunitySlug(name);
}
function canSubmitCommunitySlug(name, currentSlug) {
    return Boolean(name.trim()) && Boolean(resolveCommunitySlugForSubmit(name, currentSlug));
}
