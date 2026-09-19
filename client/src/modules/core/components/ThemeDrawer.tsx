import React, { useEffect, useMemo } from 'react';
import {
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Palette,
} from 'lucide-react';
import { useTheme } from '@/modules/core/providers/ThemeContext';
import { cn } from '@/modules/core/lib/utils';

export const ThemeDrawer: React.FC = () => {
  const {
    currentTheme,
    themeId,
    setThemeId,
    colorMode,
    setColorMode,
    isDrawerOpen,
    closeDrawer,
    resetTheme,
    availableThemes,
  } = useTheme();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const primaryColor = currentTheme.shades[600] || '#059669';

  // Curated, useful enterprise industrial themes (removed all non-useful fancy colors)
  const curatedThemeList = [
    { id: 'fairway', name: 'Fairway Orange', color: '#EB661F', subtitle: 'Signature Brand' },
    { id: 'emerald', name: 'Emerald Green', color: '#10B981', subtitle: 'Industrial Operations' },
    { id: 'blue', name: 'Corporate Blue', color: '#3B82F6', subtitle: 'Enterprise Logistics' },
    { id: 'slate', name: 'Slate Steel', color: '#64748B', subtitle: 'High-Contrast Neutral' },
    { id: 'zinc', name: 'Zinc Charcoal', color: '#71717A', subtitle: 'Minimal Monochrome' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
      />

      {/* Compact & Clean Modal Box */}
      <div className="relative w-full max-w-lg bg-surface border border-border shadow-2xl rounded-2xl flex flex-col max-h-[90vh] overflow-hidden z-10 animate-scale-in text-foreground text-left">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="size-8 rounded-xl border border-border flex items-center justify-center font-bold shrink-0"
            >
              <Palette className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Theme & Appearance
              </h2>
              <p className="text-xs text-foreground-muted">
                Choose your viewing mode and workspace brand color
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
            title="Close (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Display Mode & Curated Themes */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. Display Mode (Light / Dark / System) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Display Mode
              </label>
              <span className="text-[11px] font-semibold text-foreground-muted capitalize">
                {colorMode} mode
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {/* Light */}
              <button
                type="button"
                onClick={() => setColorMode('light')}
                style={colorMode === 'light' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer shadow-2xs gap-1",
                  colorMode === 'light'
                    ? "font-bold text-foreground ring-1"
                    : "border-border bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground"
                )}
              >
                <Sun className="size-4 text-amber-500 mb-0.5" />
                <span className="text-xs font-bold block">Light</span>
                <span className="text-[10px] text-foreground-muted hidden xs:block">Bright & crisp</span>
                {colorMode === 'light' && (
                  <Check className="size-3.5 absolute top-2 right-2 stroke-[3]" style={{ color: primaryColor }} />
                )}
              </button>

              {/* Dark */}
              <button
                type="button"
                onClick={() => setColorMode('dark')}
                style={colorMode === 'dark' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer shadow-2xs gap-1",
                  colorMode === 'dark'
                    ? "font-bold text-foreground ring-1"
                    : "border-border bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground"
                )}
              >
                <Moon className="size-4 text-sky-400 mb-0.5" />
                <span className="text-xs font-bold block">Dark</span>
                <span className="text-[10px] text-foreground-muted hidden xs:block">Comfortable at night</span>
                {colorMode === 'dark' && (
                  <Check className="size-3.5 absolute top-2 right-2 stroke-[3]" style={{ color: primaryColor }} />
                )}
              </button>

              {/* System */}
              <button
                type="button"
                onClick={() => setColorMode('system')}
                style={colorMode === 'system' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15` } : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer shadow-2xs gap-1",
                  colorMode === 'system'
                    ? "font-bold text-foreground ring-1"
                    : "border-border bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground"
                )}
              >
                <Monitor className="size-4 text-indigo-400 mb-0.5" />
                <span className="text-xs font-bold block">System</span>
                <span className="text-[10px] text-foreground-muted hidden xs:block">Device default</span>
                {colorMode === 'system' && (
                  <Check className="size-3.5 absolute top-2 right-2 stroke-[3]" style={{ color: primaryColor }} />
                )}
              </button>
            </div>
          </div>

          {/* 2. Curated Brand Color Themes (Clean, Industrial, Zero Clutter) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Color Theme
              </label>
              <span className="text-[11px] font-semibold text-foreground-muted">
                {currentTheme.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {curatedThemeList.map((t) => {
                const isSelected = themeId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThemeId(t.id)}
                    style={isSelected ? { borderColor: t.color, backgroundColor: `${t.color}15` } : undefined}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer shadow-2xs text-left group",
                      isSelected
                        ? "font-bold text-foreground ring-1"
                        : "border-border bg-surface hover:bg-surface-muted text-foreground-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="size-5 rounded-full shrink-0 ring-2 ring-border shadow-xs"
                        style={{ backgroundColor: t.color }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground block truncate">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-foreground-muted block truncate">
                          {t.subtitle}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-4 shrink-0 stroke-[3]" style={{ color: t.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-muted/30 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={resetTheme}
            className="text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-surface-muted"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            style={{ backgroundColor: primaryColor }}
            className="px-5 py-2 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeDrawer;
