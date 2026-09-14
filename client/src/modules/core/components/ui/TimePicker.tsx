import React, { useState, useEffect, useRef } from 'react';
import { Clock, ChevronDown, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/modules/core/lib/utils';

export interface TimePickerProps {
  value?: string;
  onChange?: (timeString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  id?: string;
  step?: number; // Minute step interval (default 5)
}

// Parse "11:00 AM", "14:30", "2:15 PM" to components
function parseTimeString(val?: string) {
  if (!val || !val.trim()) {
    return { hour: 11, minute: 0, period: 'AM' as 'AM' | 'PM', hasValue: false };
  }
  const trimmed = val.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    let p: 'AM' | 'PM' = 'AM';
    if (match12[3]) {
      p = match12[3].toUpperCase() as 'AM' | 'PM';
    } else if (h >= 12) {
      p = 'PM';
    }
    if (h > 12) {
      h = h % 12 || 12;
    }
    if (h === 0) h = 12;
    return { hour: h, minute: Math.min(59, Math.max(0, m)), period: p, hasValue: true };
  }
  return { hour: 11, minute: 0, period: 'AM' as 'AM' | 'PM', hasValue: false };
}

function formatTimeString(hour: number, minute: number, period: 'AM' | 'PM') {
  const hStr = hour.toString().padStart(2, '0');
  const mStr = minute.toString().padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK_PRESETS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM',
];

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select time',
  className = '',
  disabled = false,
  label,
  error: errorMsg,
  id,
  step = 5,
}) => {
  const [open, setOpen] = useState(false);
  const parsed = parseTimeString(value);

  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.period);

  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parseTimeString(value);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
  }, [value]);

  // Scroll active elements into view when opened (centered)
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const activeHourEl = hourListRef.current?.querySelector('[data-active="true"]');
        if (activeHourEl) {
          activeHourEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        const activeMinuteEl = minuteListRef.current?.querySelector('[data-active="true"]');
        if (activeMinuteEl) {
          activeMinuteEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 50);
    }
  }, [open]);

  const updateTime = (hour: number, minute: number, period: 'AM' | 'PM') => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedPeriod(period);
    const formatted = formatTimeString(hour, minute, period);
    onChange?.(formatted);
  };

  const handleSelectHour = (h: number) => {
    updateTime(h, selectedMinute, selectedPeriod);
  };

  const handleSelectMinute = (m: number) => {
    updateTime(selectedHour, m, selectedPeriod);
  };

  const handleSelectPeriod = (p: 'AM' | 'PM') => {
    updateTime(selectedHour, selectedMinute, p);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  const handleSetCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    // Round to nearest 5 min
    const roundedMin = Math.round(minutes / 5) * 5 % 60;
    updateTime(hours, roundedMin, period);
  };

  const handleSelectPreset = (preset: string) => {
    const p = parseTimeString(preset);
    updateTime(p.hour, p.minute, p.period);
    setOpen(false);
  };

  const displayText = value ? value : placeholder;
  const hasValue = Boolean(value && value.trim());

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-foreground block">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface-muted/40 px-3.5 text-xs text-foreground placeholder:text-foreground-muted outline-none transition-all hover:bg-surface-muted/70 hover:border-fairway-400 focus-visible:border-fairway-600 focus-visible:ring-1 focus-visible:ring-fairway-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs group select-none cursor-pointer',
              errorMsg && 'border-rose-500 focus-visible:ring-rose-500',
              className
            )}
          >
            <div className="flex items-center gap-2.5 truncate">
              <Clock className="w-4 h-4 text-foreground-muted group-hover:text-fairway-600 transition-colors shrink-0" />
              <span className={cn('truncate font-medium', !hasValue && 'text-foreground-muted font-normal')}>
                {displayText}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1">
              {hasValue && !disabled && (
                <span
                  onClick={handleClear}
                  className="p-1 text-foreground-muted hover:text-foreground hover:bg-surface-muted rounded-full transition-colors cursor-pointer"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown className="w-4 h-4 text-foreground-muted transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-64 p-2.5 bg-surface border border-border shadow-dialog rounded-2xl z-[100000] text-left outline-none"
          align="start"
        >
          {/* 3 Column Picker: Hours, Minutes, AM/PM */}
          <div className="grid grid-cols-3 divide-x divide-border/60">
            {/* Hours Column */}
            <div className="px-1 flex flex-col">
              <div className="text-[10px] font-bold text-foreground-muted text-center uppercase tracking-wider pb-2 border-b border-border/60">
                Hour
              </div>
              <div
                ref={hourListRef}
                className="h-48 overflow-y-auto space-y-1 py-1.5 scrollbar-thin scrollbar-thumb-border/60 hover:scrollbar-thumb-border pr-0.5"
              >
                {HOURS.map((h) => {
                  const isSelected = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-active={isSelected}
                      onClick={() => handleSelectHour(h)}
                      className={cn(
                        'w-full h-8 text-xs rounded-lg text-center transition-all font-mono font-medium flex items-center justify-center cursor-pointer',
                        isSelected
                          ? 'bg-fairway-600 text-white font-bold shadow-xs'
                          : 'text-foreground hover:bg-surface-muted'
                      )}
                    >
                      {h.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="px-1 flex flex-col">
              <div className="text-[10px] font-bold text-foreground-muted text-center uppercase tracking-wider pb-2 border-b border-border/60">
                Minute
              </div>
              <div
                ref={minuteListRef}
                className="h-48 overflow-y-auto space-y-1 py-1.5 scrollbar-thin scrollbar-thumb-border/60 hover:scrollbar-thumb-border pr-0.5"
              >
                {MINUTES_5.map((m) => {
                  const isSelected = selectedMinute === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-active={isSelected}
                      onClick={() => handleSelectMinute(m)}
                      className={cn(
                        'w-full h-8 text-xs rounded-lg text-center transition-all font-mono font-medium flex items-center justify-center cursor-pointer',
                        isSelected
                          ? 'bg-fairway-600 text-white font-bold shadow-xs'
                          : 'text-foreground hover:bg-surface-muted'
                      )}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period Column */}
            <div className="px-1 flex flex-col">
              <div className="text-[10px] font-bold text-foreground-muted text-center uppercase tracking-wider pb-2 border-b border-border/60">
                AM/PM
              </div>
              <div className="h-48 flex flex-col gap-2 py-1.5 justify-center">
                {(['AM', 'PM'] as const).map((p) => {
                  const isSelected = selectedPeriod === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPeriod(p)}
                      className={cn(
                        'h-14 text-xs rounded-xl text-center font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                        isSelected
                          ? 'bg-fairway-600 text-white shadow-xs'
                          : 'text-foreground bg-surface-muted/50 hover:bg-surface-muted border border-border/70'
                      )}
                    >
                      {p}
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {errorMsg && <p className="text-[11px] text-rose-500 font-medium">{errorMsg}</p>}
    </div>
  );
};
