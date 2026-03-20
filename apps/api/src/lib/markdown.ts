/**
 * Converts a Markdown string to plain text by stripping common Markdown syntax.
 */
export function markdownToPlaintext(md: string): string {
  return md
    // Remove images: ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Replace links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic/strikethrough markers
    .replace(/(\*{1,3}|_{1,3}|~~)(.*?)\1/g, '$2')
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, '$1')
    // Remove code fences
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquote markers
    .replace(/^>\s?/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
