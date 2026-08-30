import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/modules/core/lib/utils';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  children,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className={cn(
            'absolute mt-2 min-w-[180px] rounded-lg bg-surface border border-border p-1.5 shadow-popover z-50 animate-fade-in text-xs',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownMenuItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; destructive?: boolean }> = ({
  className,
  icon,
  destructive,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left select-none',
        destructive
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60'
          : 'text-foreground hover:bg-surface-muted hover:text-foreground',
        className
      )}
      {...props}
    >

      {icon && <span className="shrink-0 text-foreground-muted">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const DropdownMenuSeparator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('-mx-1 my-1 h-px bg-border', className)} />
);

export const DropdownMenuLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground-muted select-none', className)}>
    {children}
  </div>
);
