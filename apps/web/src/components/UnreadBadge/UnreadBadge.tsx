'use client';

interface UnreadBadgeProps {
  count: number;
  isMention?: boolean;
}

export function UnreadBadge({ count, isMention = false }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);

  return (
    <span
      className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
        isMention
          ? 'bg-danger text-white'
          : 'bg-bg-subtle text-fg-muted'
      }`}
    >
      {display}
    </span>
  );
}
