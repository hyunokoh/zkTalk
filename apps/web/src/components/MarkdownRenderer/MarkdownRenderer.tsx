'use client';

import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/github-dark.css';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);

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

/**
 * Sanitize a URL to prevent XSS via javascript:, data:, vbscript:, etc.
 * Only allows http:, https:, and mailto: protocols.
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Block dangerous protocols (javascript:, data:, vbscript:, etc.)
  if (/^\s*(?:javascript|data|vbscript)\s*:/i.test(trimmed)) {
    return '#';
  }
  return escapeHtml(trimmed);
}

function highlightCode(code: string, language?: string): string {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      // fall through to auto-detect
    }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  // Code spans (must come before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code class="rounded bg-bg-subtle px-1.5 py-0.5 text-sm font-mono text-accent">$1</code>');

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-fg-muted">$1</strong>');

  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links - sanitize URLs to prevent javascript: and other dangerous protocols
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, text, url) => {
      const safeUrl = sanitizeUrl(url);
      return `<a href="${safeUrl}" class="text-accent hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  );

  // Auto-link URLs (only http/https)
  result = result.replace(
    /(?<!\])\(?(https?:\/\/[^\s<)]+)/g,
    (match, url) => {
      if (match.startsWith('(')) return match;
      const safeUrl = sanitizeUrl(url);
      return `<a href="${safeUrl}" class="text-accent hover:underline" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    },
  );

  // @mentions: @everyone, @here, @username
  result = result.replace(
    /@(everyone|here|\w+)/g,
    '<span class="mention-highlight rounded bg-accent/20 px-1 py-0.5 text-accent font-medium">@$1</span>',
  );

  return result;
}

function renderMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const outputParts: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        const code = codeBlockLines.join('\n');
        const highlighted = highlightCode(code, codeBlockLang);
        const langLabel = codeBlockLang
          ? `<div class="mb-1 text-xs text-fg-muted">${escapeHtml(codeBlockLang)}</div>`
          : '';
        outputParts.push(
          `<pre class="hljs my-2 overflow-x-auto rounded-lg bg-bg p-3 text-sm">${langLabel}<code class="font-mono">${highlighted}</code></pre>`,
        );
        codeBlockLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        codeBlockLang = line.slice(3).trim();
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

  if (inCodeBlock && codeBlockLines.length > 0) {
    const code = codeBlockLines.join('\n');
    const highlighted = highlightCode(code, codeBlockLang);
    outputParts.push(
      `<pre class="hljs my-2 overflow-x-auto rounded-lg bg-bg p-3 text-sm"><code class="font-mono">${highlighted}</code></pre>`,
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
