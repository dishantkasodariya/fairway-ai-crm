import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { cn } from '@/modules/core/lib/utils';

export interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Computes initials:
 * - If 2+ words (e.g. "Amit Sharma"): first char of word 1 + first char of word 2 -> "AS"
 * - If 1 word (e.g. "amit"): first char only -> "A"
 * - Fallback: "U"
 */
export const getInitials = (name?: string): string => {
  if (!name) return 'U';
  const cleanName = name.trim();
  if (!cleanName) return 'U';

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    const firstChar = parts[0].charAt(0);
    const secondChar = parts[1].charAt(0);
    return `${firstChar}${secondChar}`.toUpperCase();
  }

  // Single word: e.g. "amit" -> "A"
  return parts[0].charAt(0).toUpperCase();
};

const sizeStyles = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = '',
  className = '',
  size = 'sm',
}) => {
  const initials = getInitials(name);
  const sizeClass = sizeStyles[size] || sizeStyles.sm;

  return (
    <Avatar className={cn('rounded-full shrink-0', sizeClass, className)}>
      <AvatarFallback className="bg-surface-muted text-foreground font-bold select-none border border-border rounded-full flex items-center justify-center text-center">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
