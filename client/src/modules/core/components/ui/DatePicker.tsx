import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '@/modules/core/lib/utils';

export interface DatePickerProps {
  value?: string | Date;
  onChange?: (dateString: string, dateObj?: Date) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  allowPastDates?: boolean;
  allowToday?: boolean;
  label?: string;
  error?: string;
  id?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pick a date',
  className = '',
  disabled = false,
  minDate,
  maxDate,
  allowPastDates = false,
  allowToday = false,
  label,
  error: errorMsg,
  id,
}) => {
  const [open, setOpen] = useState(false);

  // Parse incoming value to Date object
  const parseValueToDate = (val?: string | Date): Date | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return isValid(val) ? val : undefined;
    try {
      const parsed = parseISO(val);
      if (isValid(parsed)) return parsed;
      const dateFallback = new Date(val);
      return isValid(dateFallback) ? dateFallback : undefined;
    } catch {
      return undefined;
    }
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    parseValueToDate(value)
  );

  useEffect(() => {
    setSelectedDate(parseValueToDate(value));
  }, [value]);

  const handleSelect = (date?: Date) => {
    setSelectedDate(date);
    if (date && isValid(date)) {
      const formattedStr = format(date, 'yyyy-MM-dd');
      onChange?.(formattedStr, date);
      setOpen(false);
    } else {
      onChange?.('', undefined);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(undefined);
    onChange?.('', undefined);
  };

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-foreground block"
        >
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
              'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface-muted/40 px-3.5 text-xs text-foreground placeholder:text-foreground-muted outline-none transition-all hover:bg-surface-muted/70 hover:border-fairway-400 focus-visible:border-fairway-600 focus-visible:ring-1 focus-visible:ring-fairway-600 disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs group select-none',
              errorMsg && 'border-rose-500 focus-visible:ring-rose-500',
              className
            )}

          >
            <span
              className={cn(
                'flex items-center gap-2 truncate',
                selectedDate ? 'text-foreground font-medium' : 'text-foreground-muted'
              )}
            >
              <CalendarIcon className="w-4 h-4 text-foreground-muted group-hover:text-fairway-600 dark:group-hover:text-fairway-400 transition-colors shrink-0" />
              <span className="truncate">
                {selectedDate && isValid(selectedDate)
                  ? format(selectedDate, 'PPP')
                  : placeholder}
              </span>
            </span>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {selectedDate && !disabled && (
                <span
                  role="button"
                  onClick={handleClear}
                  className="p-0.5 rounded text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors"
                  title="Clear date"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-foreground-muted group-hover:text-foreground transition-colors" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto max-w-[calc(100vw-24px)] box-border p-0 border border-border bg-surface rounded-2xl shadow-xl overflow-hidden animate-scale-in"
          align="start"
          collisionPadding={12}
        >
          <div className="p-2.5 border-b border-border/80 flex items-center justify-between gap-2 bg-surface-muted/30">
            <span className="text-xs font-bold text-foreground">
              Select Date
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (allowToday) {
                    handleSelect(new Date());
                  } else {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    handleSelect(tomorrow);
                  }
                }}
                className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-fairway-50 dark:bg-fairway-950/80 text-fairway-700 dark:text-fairway-300 hover:bg-fairway-100 dark:hover:bg-fairway-900 border border-fairway-200 dark:border-fairway-800 transition-colors"
              >
                {allowToday ? 'Today' : 'Tomorrow'}
              </button>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => handleSelect(undefined)}
                  className="px-2 py-0.5 text-[11px] font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={(date) => {
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

              if (!allowPastDates && targetDay < todayStart) return true;
              if (!allowToday && targetDay === todayStart) return true;
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
          />

        </PopoverContent>
      </Popover>

      {errorMsg && <p className="text-[11px] text-rose-500 font-medium">{errorMsg}</p>}
    </div>
  );
};

export default DatePicker;
