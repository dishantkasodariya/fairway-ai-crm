import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/modules/core/lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerClassName?: string;
  contentClassName?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export const ModalFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'sticky -bottom-3.5 sm:-bottom-5 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 sm:py-3.5 bg-surface border-t border-border flex items-center justify-end gap-2.5 sm:gap-3 z-20 mt-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]',
      className
    )}
  >
    {children}
  </div>
);

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  footerClassName,
  contentClassName,
  maxWidth = 'lg',
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const maxWidths: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-6xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Dialog Box */}
      <div
        className={cn(
          'relative w-full bg-surface rounded-card border border-border shadow-dialog overflow-hidden z-10 my-auto flex flex-col max-h-[92vh] animate-fade-in',
          maxWidths[maxWidth] || 'max-w-lg'
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-surface shrink-0">
            <div className="pr-3 sm:pr-4 min-w-0">
              {title && <div className="text-sm sm:text-base font-semibold text-foreground break-words">{title}</div>}
              {description && <p className="text-xs text-foreground-muted mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-foreground-muted hover:text-foreground p-1 rounded-md hover:bg-surface-muted transition-colors shrink-0 cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={cn("px-4 sm:px-6 py-3.5 sm:py-5 overflow-y-auto flex-1", contentClassName)}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              "flex items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-border bg-surface shrink-0 flex-wrap z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]",
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

