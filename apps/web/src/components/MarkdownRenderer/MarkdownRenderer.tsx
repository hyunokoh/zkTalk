'use client';

import { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  // Code spans (must come before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-gray-800 px-1.5 py-0.5 text-sm font-mono text-indigo-300">$1</code>');

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-100">$1</strong>');

  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Auto-link URLs
  result = result.replace(
    /(?<!\])\(?(https?:\/\/[^\s<)]+)/g,
    (match, url) => {
      // Skip if already inside a markdown link
      if (match.startsWith('(')) return match;
      return `<a href="${url}" class="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">${url}</a>`;
    },
  );

  return result;
}

function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const outputParts: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        outputParts.push(
          `<pre class="my-2 overflow-x-auto rounded-lg bg-gray-800 p-3 text-sm"><code class="font-mono text-gray-300">${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`,
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    if (line.trim() === '') {
      outputParts.push('<br/>');
    } else {
      outputParts.push(`<p class="leading-relaxed">${renderInline(line)}</p>`);
    }
  }

  // If we never closed a code block, render remaining as code
  if (inCodeBlock && codeBlockLines.length > 0) {
    outputParts.push(
      `<pre class="my-2 overflow-x-auto rounded-lg bg-gray-800 p-3 text-sm"><code class="font-mono text-gray-300">${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`,
    );
  }

  return outputParts.join('');
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={`markdown-body space-y-0.5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
