'use client';

import * as React from 'react';
import { useState } from 'react';
import { ChevronsUpDown, Check, Mail } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/modules/core/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/modules/core/components/ui/popover';
import { cn } from '@/modules/core/lib/utils';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  email?: string;
  avatar?: string;
  initials?: string;
  color?: string;
  icon?: React.ReactNode;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No option found.',
  className,
  triggerClassName,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface dark:bg-[#161B22] px-3.5 py-2 text-xs text-foreground shadow-2xs outline-none transition-all hover:bg-surface-muted/60 hover:border-fairway-400/60 focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500/30 disabled:cursor-not-allowed disabled:opacity-50 text-left cursor-pointer',
            open && 'border-fairway-500 ring-1 ring-fairway-500/30',
            triggerClassName,
            className
          )}
        >
          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
            {selectedOption ? (
              <>
                {selectedOption.avatar || selectedOption.initials ? (
                  <UserAvatar
                    src={selectedOption.avatar}
                    name={selectedOption.label}
                    size="xs"
                    className="w-6 h-6 rounded-full shrink-0 ring-1 ring-border"
                  />
                ) : (
                  selectedOption.icon || null
                )}
                <div className="flex flex-col truncate min-w-0 leading-tight">
                  <span className="truncate font-semibold text-foreground">
                    {selectedOption.label}
                  </span>
                  {(selectedOption.email || selectedOption.description) && (
                    <span className="text-[10px] text-foreground-muted truncate font-normal">
                      {selectedOption.email || selectedOption.description}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-foreground-muted">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50 text-foreground-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(240px,calc(100vw-24px))] max-w-[calc(100vw-24px)] p-0 rounded-2xl border border-border bg-surface dark:bg-[#161B22] shadow-2xl overflow-hidden z-[99999] animate-fade-in"
      >
        <Command className="w-full bg-transparent">
          <CommandInput placeholder={searchPlaceholder} className="h-9 text-xs" />
          <CommandList className="max-h-60 p-1.5 overflow-y-auto">
            <CommandEmpty className="py-5 text-center text-xs text-foreground-muted">
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.email || ''} ${option.description || ''}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all gap-2.5 my-0.5',
                      isSelected
                        ? 'bg-fairway-600/10 text-fairway-700 dark:text-fairway-300 font-semibold'
                        : 'text-foreground hover:bg-surface-muted/80 dark:hover:bg-[#1f2633]'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                      {option.avatar || option.initials ? (
                        <UserAvatar
                          src={option.avatar}
                          name={option.label}
                          size="sm"
                          className="w-7 h-7 rounded-full shrink-0 ring-1 ring-border"
                        />
                      ) : (
                        option.icon
                      )}

                      <div className="flex flex-col min-w-0 text-left flex-1">
                        <span className="font-semibold text-foreground truncate">
                          {option.label}
                        </span>
                        {(option.email || option.description) && (
                          <span className="text-[10px] text-foreground-muted truncate flex items-center gap-1">
                            {option.email && <Mail className="w-3 h-3 opacity-60 shrink-0" />}
                            <span>{option.email || option.description}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-fairway-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default Combobox;
