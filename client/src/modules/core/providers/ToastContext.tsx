import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

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
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, options?: { message?: string; type?: ToastType; duration?: number }) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const type = options?.type || 'info';
      const newToast: Toast = { id, title, message: options?.message, type };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, options?.duration || 4000);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => toast(title, { message, type: 'success' }), [toast]);
  const error = useCallback((title: string, message?: string) => toast(title, { message, type: 'error' }), [toast]);
  const info = useCallback((title: string, message?: string) => toast(title, { message, type: 'info' }), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Fixed bottom-right toast stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-card border shadow-dialog bg-white animate-fade-in transition-all ${
              t.type === 'success'
                ? 'border-emerald-200 text-emerald-950'
                : t.type === 'error'
                ? 'border-rose-200 text-rose-950'
                : 'border-slate-200 text-slate-900'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight">{t.title}</h4>
              {t.message && <p className="text-xs text-foreground-muted mt-1 leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-foreground-muted hover:text-foreground shrink-0 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
