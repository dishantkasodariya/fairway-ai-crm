import React, { createContext, useContext, useCallback } from 'react';
import hotToast, { Toaster } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (title: string, options?: { message?: string; type?: ToastType; duration?: number }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = useCallback(
    (title: string, options?: { message?: string; type?: ToastType; duration?: number }) => {
      const type = options?.type || 'info';
      const message = options?.message;
      const duration = options?.duration || 4000;

      hotToast.custom(
        (t) => (
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl border border-border bg-surface text-foreground shadow-xl transition-all duration-200 max-w-sm w-full select-none ${
              t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
            }`}
          >
            {type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            )}
            {type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            {type === 'info' && (
              <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            )}
            {type === 'warning' && (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold text-foreground leading-tight">{title}</h4>
              {message && (
                <p className="text-[11px] text-foreground-muted mt-1 leading-relaxed">{message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => hotToast.dismiss(t.id)}
              className="text-foreground-muted hover:text-foreground shrink-0 p-1 rounded-md hover:bg-surface-muted transition-colors cursor-pointer"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
        { duration }
      );
    },
    []
  );

  const formatMessage = (msg?: any): string | undefined => {
    if (!msg) return undefined;
    if (typeof msg === 'string') return msg;
    if (typeof msg?.message === 'string') return msg.message;
    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  };

  const success = useCallback(
    (title: string, message?: any) => showToast(title, { message: formatMessage(message), type: 'success' }),
    [showToast]
  );
  const error = useCallback(
    (title: string, message?: any) => showToast(title, { message: formatMessage(message), type: 'error' }),
    [showToast]
  );
  const info = useCallback(
    (title: string, message?: any) => showToast(title, { message: formatMessage(message), type: 'info' }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toast: showToast, success, error, info }}>
      {children}
      {/* React-Hot-Toast container configured at bottom-right, theme-aware, NO ring */}
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={10}
        containerClassName="!bottom-5 !right-5 z-[99999]"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--bg-surface, #ffffff)',
            color: 'var(--text-foreground, #16201b)',
            border: '1px solid var(--border-color, #dde5e1)',
            boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.06)',
            borderRadius: '0.75rem',
            padding: '12px 16px',
            fontSize: '0.875rem',
            fontWeight: 500,
            maxWidth: '420px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: 'var(--bg-surface, #ffffff)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'var(--bg-surface, #ffffff)',
            },
          },
        }}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// Re-export hotToast for direct usage across application
export { hotToast as toast };
