import React, { useState, useMemo } from 'react';
import {
  ChevronsUpDown,
  Check,
  Search,
  User as UserIcon,
  Mail,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/modules/core/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/modules/core/components/ui/command';
import { cn } from '@/modules/core/lib/utils';
import { User } from '@/modules/core/types';
import { UserAvatar } from '@/modules/core/components/ui/UserAvatar';

export interface UserComboboxProps {
  users: User[];
  value?: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  label?: string;
  showEmail?: boolean;
  allowClear?: boolean;
}

export const UserCombobox: React.FC<UserComboboxProps> = ({
  users = [],
  value,
  onChange,
  placeholder = 'Select user...',
  searchPlaceholder = 'Search users...',
  emptyText = 'No matching users found.',
  disabled = false,
  className,
  triggerClassName,
  label,
  showEmail = true,
  allowClear = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedUser = useMemo(() => {
    if (!value) return null;
    return users.find((u) => u.id === value || u.name.toLowerCase() === value.toLowerCase());
  }, [users, value]);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q))
    );
  }, [users, query]);

  return (
    <div className={cn('space-y-1.5 text-left w-full', className)}>
      {label && <label className="text-xs font-semibold text-foreground block">{label}</label>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface dark:bg-[#161B22] px-3 py-2 text-xs text-foreground shadow-2xs outline-none transition-all hover:bg-surface-muted/60 hover:border-fairway-400/60 focus:border-fairway-500 focus:ring-1 focus:ring-fairway-500/30 disabled:cursor-not-allowed disabled:opacity-50 text-left cursor-pointer',
              open && 'border-fairway-500 ring-1 ring-fairway-500/30',
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
              {selectedUser ? (
                <>
                  <UserAvatar
                    src={selectedUser.avatar}
                    name={selectedUser.name}
                    size="sm"
                    className="w-7 h-7 rounded-full shrink-0 ring-1 ring-border"
                  />
                  <div className="flex flex-col truncate min-w-0 leading-tight">
                    <span className="font-bold text-foreground truncate text-xs">
                      {selectedUser.name}
                    </span>
                    {showEmail && selectedUser.email && (
                      <span className="text-[11px] text-foreground-muted truncate font-normal">
                        {selectedUser.email}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-foreground-muted">
                  <div className="w-7 h-7 rounded-full bg-surface-muted border border-border flex items-center justify-center shrink-0">
                    <UserIcon className="w-3.5 h-3.5 opacity-50" />
                  </div>
                  <span className="text-xs">{placeholder}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {allowClear && selectedUser && !disabled && (
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50 text-foreground-muted" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          collisionPadding={12}
          className="w-[var(--radix-popover-trigger-width)] min-w-[min(260px,calc(100vw-24px))] max-w-[calc(100vw-24px)] p-0 rounded-2xl border border-border bg-surface dark:bg-[#161B22] shadow-2xl overflow-hidden z-[99999] animate-fade-in"
        >
          <Command className="w-full bg-transparent">
            <div className="flex items-center border-b border-border px-3.5 py-1 bg-surface-muted/30">
              <Search className="w-4 h-4 text-foreground-muted mr-2.5 shrink-0 opacity-60" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-xs text-foreground placeholder:text-foreground-muted outline-none border-none ring-0 focus:outline-none focus:ring-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-foreground-muted hover:text-foreground rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <CommandList className="max-h-64 overflow-y-auto p-1.5">
              {filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-foreground-muted">
                  {emptyText}
                </div>
              ) : (
                <CommandGroup>
                  {filteredUsers.map((user) => {
                    const isSelected = value === user.id || value?.toLowerCase() === user.name.toLowerCase();

                    return (
                      <CommandItem
                        key={user.id}
                        value={`${user.name} ${user.email || ''} ${user.role || ''}`}
                        onSelect={() => {
                          onChange(user.id);
                          setOpen(false);
                          setQuery('');
                        }}
                        className={cn(
                          'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all gap-3 my-0.5',
                          isSelected
                            ? 'bg-fairway-600/10 text-fairway-700 dark:text-fairway-300 font-semibold'
                            : 'text-foreground hover:bg-surface-muted/80 dark:hover:bg-[#1f2633]'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <UserAvatar
                            src={user.avatar}
                            name={user.name}
                            size="sm"
                            className="w-8 h-8 rounded-full shrink-0 ring-1 ring-border"
                          />

                          <div className="flex flex-col min-w-0 text-left flex-1">
                            <span className="font-bold text-foreground truncate text-xs">
                              {user.name}
                            </span>
                            {user.email && (
                              <span className="text-[11px] text-foreground-muted truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 text-foreground-muted/70 shrink-0" />
                                <span>{user.email}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-fairway-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default UserCombobox;
