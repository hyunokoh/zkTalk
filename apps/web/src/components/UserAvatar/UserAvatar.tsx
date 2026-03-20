'use client';

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const;

interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserAvatar({
  displayName,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const sizeClasses = sizes[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${sizeClasses} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-medium text-white ${className}`}
    >
      {getInitials(displayName)}
    </div>
  );
}
