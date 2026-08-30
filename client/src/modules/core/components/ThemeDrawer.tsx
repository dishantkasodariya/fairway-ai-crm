import React, { useEffect } from 'react';
import {
  X,
  Check,
  Sun,
  Moon,
  Monitor,
  LayoutTemplate,
  Sidebar,
  Sparkles,
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
    navStyle,
    setNavStyle,
    radius,
    setRadius,
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

  const radiusPresets = [0, 4, 8, 12, 16, 24];
  const primaryColor = currentTheme.shades[600] || '#0084ff';
  const previewColor = currentTheme.previewColor || primaryColor;

  const modalRadius = Math.round(radius * 1.5);
  const cardRadius = Math.round(radius * 1.25);
  const buttonRadius = radius;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 select-none animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      {/* Modal Dialog Box */}
      <div
        style={{ borderRadius: `${modalRadius}px` }}
        className="relative w-full max-w-5xl bg-white dark:bg-[#0a0a0a] border border-border dark:border-[#262626] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden z-10 animate-scale-in transition-all duration-150 text-foreground"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border dark:border-[#262626] bg-slate-50/80 dark:bg-[#171717] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              style={{
                backgroundColor: `${primaryColor}20`,
                color: previewColor,
                borderColor: `${primaryColor}40`,
                borderRadius: `${Math.max(6, buttonRadius)}px`,
              }}
              className="size-8 border flex items-center justify-center font-bold transition-colors shrink-0"
            >
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Customize Theme
              </h2>
              <p className="text-xs text-foreground-muted">
                Personalize your workspace appearance, layout, corner curves, and accent palette
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            style={{ borderRadius: `${buttonRadius}px` }}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-muted dark:hover:bg-[#262626] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns Layout Matching Reference */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white dark:bg-[#0a0a0a]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT COLUMN: Display Mode + Navigation Style + Corner Radius */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* 1. Display Mode Card */}
              <div
                style={{ borderRadius: `${cardRadius}px` }}
                className="bg-slate-50/60 dark:bg-[#171717] border border-border dark:border-[#262626] p-5 space-y-3.5 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Display Mode</h3>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Choose your day and night viewing preference.
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: previewColor,
                      borderColor: `${primaryColor}40`,
                    }}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize transition-colors"
                  >
                    {colorMode}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  {/* Light */}
                  <button
                    type="button"
                    onClick={() => setColorMode('light')}
                    style={{
                      borderRadius: `${buttonRadius}px`,
                      borderColor: colorMode === 'light' ? primaryColor : undefined,
                      backgroundColor: colorMode === 'light' ? `${primaryColor}15` : undefined,
                    }}
                    className={cn(
                      "relative flex flex-col items-start p-3.5 border text-left transition-all cursor-pointer",
                      colorMode === 'light'
                        ? "text-foreground font-semibold shadow-xs"
                        : "bg-white dark:bg-[#262626]/80 border-border dark:border-[#262626] text-foreground-muted hover:border-border/80 hover:text-foreground hover:bg-slate-50 dark:hover:bg-[#262626]"
                    )}
                  >
                    <Sun className="size-4 mb-2 text-amber-500" />
                    <span className="text-xs font-bold text-foreground block">Light</span>
                    <span className="text-[10px] text-foreground-muted mt-0.5">Bright and crisp</span>
                    {colorMode === 'light' && (
                      <span
                        style={{ backgroundColor: primaryColor }}
                        className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.2 rounded text-white shadow-xs"
                      >
                        ACTIVE
                      </span>
                    )}
                  </button>

                  {/* Dark */}
                  <button
                    type="button"
                    onClick={() => setColorMode('dark')}
                    style={{
                      borderRadius: `${buttonRadius}px`,
                      borderColor: colorMode === 'dark' ? primaryColor : undefined,
                      backgroundColor: colorMode === 'dark' ? `${primaryColor}15` : undefined,
                    }}
                    className={cn(
                      "relative flex flex-col items-start p-3.5 border text-left transition-all cursor-pointer",
                      colorMode === 'dark'
                        ? "text-foreground dark:text-white font-semibold shadow-xs"
                        : "bg-white dark:bg-[#262626]/80 border-border dark:border-[#262626] text-foreground-muted hover:border-border/80 hover:text-foreground hover:bg-slate-50 dark:hover:bg-[#262626]"
                    )}
                  >
                    <Moon
                      style={{ color: colorMode === 'dark' ? previewColor : undefined }}
                      className="size-4 mb-2 text-foreground-muted"
                    />
                    <span className="text-xs font-bold text-foreground block">Dark</span>
                    <span className="text-[10px] text-foreground-muted mt-0.5">Comfortable at night</span>
                    {colorMode === 'dark' && (
                      <span
                        style={{ backgroundColor: primaryColor }}
                        className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.2 rounded text-white shadow-xs"
                      >
                        ACTIVE
                      </span>
                    )}
                  </button>

                  {/* System */}
                  <button
                    type="button"
                    onClick={() => setColorMode('system')}
                    style={{
                      borderRadius: `${buttonRadius}px`,
                      borderColor: colorMode === 'system' ? primaryColor : undefined,
                      backgroundColor: colorMode === 'system' ? `${primaryColor}15` : undefined,
                    }}
                    className={cn(
                      "relative flex flex-col items-start p-3.5 border text-left transition-all cursor-pointer",
                      colorMode === 'system'
                        ? "text-foreground font-semibold shadow-xs"
                        : "bg-white dark:bg-[#262626]/80 border-border dark:border-[#262626] text-foreground-muted hover:border-border/80 hover:text-foreground hover:bg-slate-50 dark:hover:bg-[#262626]"
                    )}
                  >
                    <Monitor className="size-4 mb-2 text-indigo-500 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-foreground block">System</span>
                    <span className="text-[10px] text-foreground-muted mt-0.5">Match your device</span>
                    {colorMode === 'system' && (
                      <span
                        style={{ backgroundColor: primaryColor }}
                        className="absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.2 rounded text-white shadow-xs"
                      >
                        ACTIVE
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Navigation Style Card */}
              <div
                style={{ borderRadius: `${cardRadius}px` }}
                className="bg-slate-50/60 dark:bg-[#171717] border border-border dark:border-[#262626] p-5 space-y-3.5 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Navigation Style</h3>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Decide where your main menu should live.
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: previewColor,
                      borderColor: `${primaryColor}40`,
                    }}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize transition-colors"
                  >
                    {navStyle}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Vertical Menu */}
                  <button
                    type="button"
                    onClick={() => setNavStyle('vertical')}
                    style={{
                      borderRadius: `${buttonRadius}px`,
                      borderColor: navStyle === 'vertical' ? primaryColor : undefined,
                      backgroundColor: navStyle === 'vertical' ? `${primaryColor}15` : undefined,
                    }}
                    className={cn(
                      "relative flex flex-col items-start p-3.5 border text-left transition-all cursor-pointer",
                      navStyle === 'vertical'
                        ? "text-foreground font-semibold shadow-xs"
                        : "bg-white dark:bg-[#262626]/80 border-border dark:border-[#262626] text-foreground-muted hover:border-border/80 hover:text-foreground hover:bg-slate-50 dark:hover:bg-[#262626]"
                    )}
                  >
                    <Sidebar
                      style={{ color: navStyle === 'vertical' ? previewColor : undefined }}
                      className="size-4 mb-2 text-foreground-muted"
                    />
                    <span className="text-xs font-bold text-foreground block">Vertical Menu</span>
                    <span className="text-[10px] text-foreground-muted mt-0.5">Sidebar for deep navigation</span>
                    {navStyle === 'vertical' && (
                      <Check
                        style={{ color: previewColor }}
                        className="absolute top-3.5 right-3.5 size-4 stroke-[3]"
                      />
                    )}
                  </button>

                  {/* Horizontal Menu */}
                  <button
                    type="button"
                    onClick={() => setNavStyle('horizontal')}
                    style={{
                      borderRadius: `${buttonRadius}px`,
                      borderColor: navStyle === 'horizontal' ? primaryColor : undefined,
                      backgroundColor: navStyle === 'horizontal' ? `${primaryColor}15` : undefined,
                    }}
                    className={cn(
                      "relative flex flex-col items-start p-3.5 border text-left transition-all cursor-pointer",
                      navStyle === 'horizontal'
                        ? "text-foreground font-semibold shadow-xs"
                        : "bg-white dark:bg-[#262626]/80 border-border dark:border-[#262626] text-foreground-muted hover:border-border/80 hover:text-foreground hover:bg-slate-50 dark:hover:bg-[#262626]"
                    )}
                  >
                    <LayoutTemplate
                      style={{ color: navStyle === 'horizontal' ? previewColor : undefined }}
                      className="size-4 mb-2 text-foreground-muted"
                    />
                    <span className="text-xs font-bold text-foreground block">Horizontal Menu</span>
                    <span className="text-[10px] text-foreground-muted mt-0.5">Top bar for quick access</span>
                    {navStyle === 'horizontal' && (
                      <Check
                        style={{ color: previewColor }}
                        className="absolute top-3.5 right-3.5 size-4 stroke-[3]"
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Corner Radius Card */}
              <div
                style={{ borderRadius: `${cardRadius}px` }}
                className="bg-slate-50/60 dark:bg-[#171717] border border-border dark:border-[#262626] p-5 space-y-4 shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Corner Radius</h3>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Set how rounded your interface elements should feel.
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: previewColor,
                      borderColor: `${primaryColor}40`,
                    }}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors"
                  >
                    {radius}px
                  </span>
                </div>

                {/* Range Slider */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[11px] text-foreground-muted font-medium">
                    <span>0px</span>
                    <span>24px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="2"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                    style={{ accentColor: primaryColor }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-[#262626] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Preset Radius Buttons */}
                <div className="grid grid-cols-6 gap-2">
                  {radiusPresets.map((r) => {
                    const isSelected = radius === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRadius(r)}
                        style={{
                          borderRadius: `${r}px`,
                          backgroundColor: isSelected ? primaryColor : undefined,
                          borderColor: isSelected ? primaryColor : undefined,
                        }}
                        className={cn(
                          "py-1.5 text-xs font-semibold border transition-all cursor-pointer text-center",
                          isSelected
                            ? "text-white shadow-xs font-bold"
                            : "bg-white dark:bg-[#262626] border-border dark:border-[#262626] text-foreground-muted hover:text-foreground hover:border-border/80"
                        )}
                      >
                        {r}px
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Color Theme Swatches Matrix (20 Swatches) */}
            <div className="lg:col-span-5">
              <div
                style={{ borderRadius: `${cardRadius}px` }}
                className="bg-slate-50/60 dark:bg-[#171717] border border-border dark:border-[#262626] p-5 space-y-4 h-full flex flex-col shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Color Theme</h3>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Pick a color personality for your interface.
                    </p>
                  </div>
                  <span
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: previewColor,
                      borderColor: `${primaryColor}40`,
                    }}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors"
                  >
                    {currentTheme.name}
                  </span>
                </div>

                {/* 4 x 5 Grid of 20 Swatches */}
                <div className="grid grid-cols-4 gap-3.5 pt-2 flex-1 content-start">
                  {availableThemes.map((theme) => {
                    const isSelected = theme.id === themeId;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setThemeId(theme.id)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group select-none"
                      >
                        <div
                          className={cn(
                            "w-full h-14 flex items-center justify-center transition-all group-hover:scale-105 relative shadow-sm",
                            isSelected
                              ? "ring-2 ring-foreground/90 dark:ring-white/90 ring-offset-2 ring-offset-white dark:ring-offset-[#171717]"
                              : "border border-border/40 opacity-90 group-hover:opacity-100"
                          )}
                          style={{
                            backgroundColor: theme.previewColor,
                            borderRadius: `${Math.max(6, buttonRadius)}px`,
                          }}
                        >
                          {isSelected && (
                            <Check className="size-5 text-white stroke-[3] drop-shadow-md" />
                          )}
                        </div>
                        <span className={cn(
                          "text-[11px] font-medium transition-colors truncate max-w-full text-center",
                          isSelected ? "text-foreground font-bold" : "text-foreground-muted group-hover:text-foreground"
                        )}>
                          {theme.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-border dark:border-[#262626] bg-slate-50/80 dark:bg-[#171717] flex items-center justify-between">
          <button
            type="button"
            onClick={resetTheme}
            style={{ borderRadius: `${buttonRadius}px` }}
            className="text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors cursor-pointer px-3 py-1.5 hover:bg-surface-muted dark:hover:bg-[#262626]"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={closeDrawer}
            style={{
              backgroundColor: primaryColor,
              borderRadius: `${buttonRadius}px`,
            }}
            className="px-6 py-2 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:brightness-110 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeDrawer;
