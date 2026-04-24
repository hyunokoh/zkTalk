'use client';

import { useEffect, useRef } from 'react';

const EMOJI_LIST = [
  { emoji: '\uD83D\uDC4D', label: 'thumbs up' },
  { emoji: '\u2764\uFE0F', label: 'heart' },
  { emoji: '\uD83D\uDE02', label: 'laugh' },
  { emoji: '\uD83D\uDE2E', label: 'wow' },
  { emoji: '\uD83D\uDE22', label: 'sad' },
  { emoji: '\uD83D\uDD25', label: 'fire' },
  { emoji: '\uD83D\uDE80', label: 'rocket' },
  { emoji: '\uD83D\uDC40', label: 'eyes' },
  { emoji: '\uD83D\uDCAF', label: '100' },
  { emoji: '\uD83C\uDF89', label: 'party' },
];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 z-50 mb-1 grid grid-cols-5 gap-1 rounded-lg border border-line bg-bg-subtle p-2 shadow-xl"
    >
      {EMOJI_LIST.map(({ emoji, label }) => (
        <button
          key={label}
          onClick={() => onSelect(emoji)}
          title={label}
          className="flex h-8 w-8 items-center justify-center rounded text-lg transition-colors hover:bg-bg-subtle"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
