import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  setMonth as setDateMonth,
  setYear as setDateYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  eachDayOfInterval,
} from 'date-fns';
import { cn } from '@/modules/core/lib/utils';

export interface CalendarProps {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date?: Date) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  fromYear?: number;
  toYear?: number;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  disabled,
  className = '',
  minDate,
  maxDate,
  fromYear = 1950,
  toYear = 2040,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(
    selected && !isNaN(selected.getTime()) ? selected : new Date()
  );

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const yearListRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMonthDropdownOpen(false);
      }
      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(e.target as Node)
      ) {
        setIsYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll active year into view when year dropdown opens
  useEffect(() => {
    if (isYearDropdownOpen && yearListRef.current) {
      const activeYearBtn = yearListRef.current.querySelector('[data-active-year="true"]');
      if (activeYearBtn) {
        (activeYearBtn as HTMLElement).scrollIntoView({ block: 'center' });
      }
    }
  }, [isYearDropdownOpen]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSelectMonth = (monthIdx: number) => {
    setCurrentMonth(setDateMonth(currentMonth, monthIdx));
    setIsMonthDropdownOpen(false);
  };

  const handleSelectYear = (year: number) => {
    setCurrentMonth(setDateYear(currentMonth, year));
    setIsYearDropdownOpen(false);
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Starts on Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Years array
  const years: number[] = [];
  for (let y = fromYear; y <= toYear; y++) {
    years.push(y);
  }

  const currentMonthIdx = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();

  return (
    <div className={cn('relative p-3 select-none bg-surface text-foreground w-[270px] sm:w-[280px]', className)}>
      {/* Header controls matching screenshot */}
      <div className="flex items-center justify-between gap-1 pb-2">
        {/* Previous Month Button */}
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors flex items-center justify-center shrink-0"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center Selectors: [Month ⌵] and [Year ⌵] */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          {/* Month Dropdown Trigger */}
          <div className="relative" ref={monthDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsMonthDropdownOpen(!isMonthDropdownOpen);
                setIsYearDropdownOpen(false);
              }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-muted transition-all shadow-2xs text-foreground',
                isMonthDropdownOpen && 'border-fairway-500 ring-1 ring-fairway-500 text-fairway-600 dark:text-fairway-400'
              )}
            >
              <span>{MONTHS[currentMonthIdx]}</span>
              <ChevronDown className="w-3 h-3 text-foreground-muted" />
            </button>

            {/* Month Menu Dropdown */}
            {isMonthDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-30 w-32 bg-surface rounded-xl border border-border shadow-xl p-1.5 max-h-56 overflow-y-auto space-y-0.5 animate-scale-in">
                {MONTHS.map((m, idx) => {
                  const isSelectedMonth = currentMonthIdx === idx;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                        isSelectedMonth
                          ? 'bg-fairway-500/10 font-bold text-fairway-700 dark:text-fairway-300'
                          : 'text-foreground hover:bg-surface-muted/60'
                      )}
                    >
                      <span>{m}</span>
                      {isSelectedMonth && <Check className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Year Dropdown Trigger */}
          <div className="relative" ref={yearDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsYearDropdownOpen(!isYearDropdownOpen);
                setIsMonthDropdownOpen(false);
              }}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-muted transition-all shadow-2xs text-foreground',
                isYearDropdownOpen && 'border-fairway-500 ring-1 ring-fairway-500 text-fairway-600 dark:text-fairway-400'
              )}
            >
              <span>{currentYear}</span>
              <ChevronDown className="w-3 h-3 text-foreground-muted" />
            </button>

            {/* Year Menu Dropdown */}
            {isYearDropdownOpen && (
              <div
                ref={yearListRef}
                className="absolute top-full left-0 mt-1 z-30 w-28 bg-surface rounded-xl border border-border shadow-xl p-1.5 max-h-56 overflow-y-auto space-y-0.5 animate-scale-in"
              >
                {years.map((y) => {
                  const isSelectedYear = currentYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      data-active-year={isSelectedYear}
                      onClick={() => handleSelectYear(y)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left',
                        isSelectedYear
                          ? 'bg-fairway-500/10 font-bold text-fairway-700 dark:text-fairway-300'
                          : 'text-foreground hover:bg-surface-muted/60'
                      )}
                    >
                      <span>{y}</span>
                      {isSelectedYear && <Check className="w-3.5 h-3.5 text-fairway-600 dark:text-fairway-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Next Month Button */}
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors flex items-center justify-center shrink-0"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers: S M T W T F S */}
      <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
        {weekDays.map((day, idx) => (
          <span
            key={`${day}-${idx}`}
            className="text-xs font-medium text-foreground-muted/70 py-1"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 pt-1">
        {days.map((day) => {
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const isDisabled =
            disabled?.(day) ||
            (minDate && day < minDate) ||
            (maxDate && day > maxDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onSelect?.(day);
                }
              }}
              className={cn(
                'h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs transition-all select-none',
                // Current month vs other month
                isCurrentMonth ? 'text-foreground font-normal' : 'text-foreground-muted/35 font-normal',
                // Hover day with theme color
                !isDisabled && !isSelected && 'hover:bg-fairway-50 dark:hover:bg-fairway-950/60 hover:text-fairway-900 dark:hover:text-fairway-200',
                // Today indicator with theme color
                isCurrentDay && !isSelected && 'border border-fairway-500/80 font-bold text-fairway-700 dark:text-fairway-300 bg-fairway-500/10',
                // Selected Day with active theme primary color
                isSelected && 'bg-fairway-600 hover:bg-fairway-700 text-white font-bold rounded-lg shadow-xs scale-105',
                // Disabled Day
                isDisabled && 'opacity-20 cursor-not-allowed hover:bg-transparent'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
