import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  Country,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import en from 'react-phone-number-input/locale/en.json';
import { ChevronsUpDown, Globe, Check } from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/core/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/modules/core/components/ui/command';

export type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'ref'
> & {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: Country;
  className?: string;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
};

interface CountryOption {
  value: Country;
  label: string;
  callingCode: string;
}

/**
 * Standard maximum national digit limits per country.
 * e.g., India strictly allows 10 digits.
 */
export const COUNTRY_MAX_DIGITS: Record<string, number> = {
  IN: 10, // India: 10 digits
  US: 10, // United States: 10 digits
  CA: 10, // Canada: 10 digits
  GB: 10, // United Kingdom: 10 digits
  AE: 9,  // UAE: 9 digits
  SA: 9,  // Saudi Arabia: 9 digits
  SG: 8,  // Singapore: 8 digits
  AU: 9,  // Australia: 9 digits
  DE: 11, // Germany: 11 digits
  FR: 9,  // France: 9 digits
  JP: 10, // Japan: 10 digits
  CN: 11, // China: 11 digits
  QA: 8,  // Qatar: 8 digits
  KW: 8,  // Kuwait: 8 digits
  OM: 8,  // Oman: 8 digits
  BH: 8,  // Bahrain: 8 digits
  BD: 10, // Bangladesh: 10 digits
  PK: 10, // Pakistan: 10 digits
  MY: 10, // Malaysia: 10 digits
  ID: 11, // Indonesia: 11 digits
  IT: 10, // Italy: 10 digits
  ES: 9,  // Spain: 9 digits
  NL: 9,  // Netherlands: 9 digits
  RU: 10, // Russia: 10 digits
  ZA: 9,  // South Africa: 9 digits
  BR: 11, // Brazil: 11 digits
  MX: 10, // Mexico: 10 digits
  NZ: 9,  // New Zealand: 9 digits
  HK: 8,  // Hong Kong: 8 digits
  KR: 10, // South Korea: 10 digits
  TH: 9,  // Thailand: 9 digits
  VN: 10, // Vietnam: 10 digits
  PH: 10, // Philippines: 10 digits
  TR: 10, // Turkey: 10 digits
  EG: 10, // Egypt: 10 digits
  NG: 10, // Nigeria: 10 digits
  KE: 9,  // Kenya: 9 digits
};

/**
 * Format national digits cleanly for visual display
 */
export const formatNationalDigits = (digits: string, countryCode: string): string => {
  if (!digits) return '';
  if (countryCode === 'IN') {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  }
  if (countryCode === 'US' || countryCode === 'CA') {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
  if (countryCode === 'GB') {
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
  }
  if (countryCode === 'AE' || countryCode === 'SA') {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
  }
  return digits;
};

/**
 * Parse value into country and national digits
 */
const parseValueToParts = (
  val: string,
  fallbackCountry: Country = 'IN'
): { country: Country; nationalDigits: string } => {
  if (!val || !val.trim()) {
    return { country: fallbackCountry, nationalDigits: '' };
  }

  const clean = val.trim();

  // Try standard parsePhoneNumber first
  if (clean.startsWith('+')) {
    try {
      const parsed = parsePhoneNumber(clean);
      if (parsed && parsed.country) {
        return {
          country: parsed.country,
          nationalDigits: parsed.nationalNumber || '',
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Check if string starts with current country calling code
  try {
    const code = getCountryCallingCode(fallbackCountry);
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean.startsWith(`+${code}`) || (digitsOnly.startsWith(code) && digitsOnly.length > code.length + 5)) {
      const remaining = digitsOnly.startsWith(code) ? digitsOnly.slice(code.length) : digitsOnly;
      return { country: fallbackCountry, nationalDigits: remaining };
    }
    // If just "+91" or matching code with no number, return empty digits
    if (clean === `+${code}` || digitsOnly === code) {
      return { country: fallbackCountry, nationalDigits: '' };
    }
    return { country: fallbackCountry, nationalDigits: digitsOnly };
  } catch {
    return { country: fallbackCountry, nationalDigits: clean.replace(/\D/g, '') };
  }
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value = '',
  onChange,
  defaultCountry = 'IN',
  className,
  error = false,
  disabled = false,
  placeholder,
  id,
  ...props
}) => {
  // Initialize country and national number from value
  const initial = useMemo(() => parseValueToParts(value, defaultCountry), []);
  const [country, setCountry] = useState<Country>(initial.country);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.nationalDigits);

  // Synchronize when external value prop changes
  useEffect(() => {
    const parts = parseValueToParts(value, country);
    setCountry(parts.country);
    setNationalNumber(parts.nationalDigits);
  }, [value]);

  const callingCode = useMemo(() => {
    try {
      return getCountryCallingCode(country);
    } catch {
      return '91';
    }
  }, [country]);

  const maxDigits = useMemo(() => {
    return COUNTRY_MAX_DIGITS[country] || 15;
  }, [country]);

  // Clean placeholder so it never contains duplicate "+<callingCode>"
  const cleanPlaceholder = useMemo(() => {
    if (placeholder) {
      return placeholder.replace(/\+?\d{1,4}\s*/, '');
    }
    return country === 'IN' ? '98250 11223' : `${maxDigits} digits`;
  }, [placeholder, country, maxDigits]);

  const handleCountryChange = (newCountry: Country) => {
    setCountry(newCountry);
    try {
      const newCode = getCountryCallingCode(newCountry);
      const newMax = COUNTRY_MAX_DIGITS[newCountry] || 15;
      const clampedDigits = nationalNumber.slice(0, newMax);
      setNationalNumber(clampedDigits);
      if (clampedDigits.length > 0) {
        onChange?.(`+${newCode}${clampedDigits}`);
      } else {
        onChange?.('');
      }
    } catch {
      setCountry(newCountry);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    let digits = rawVal.replace(/\D/g, '');

    // If user pasted a full number with country calling code (e.g. "+91 9825011223" or "919825011223")
    if (digits.startsWith(callingCode) && (rawVal.includes('+') || digits.length > maxDigits)) {
      digits = digits.slice(callingCode.length);
    }

    // Strictly enforce country-wise maximum digits
    if (digits.length > maxDigits) {
      digits = digits.slice(0, maxDigits);
    }

    setNationalNumber(digits);

    if (digits.length > 0) {
      onChange?.(`+${callingCode}${digits}`);
    } else {
      onChange?.('');
    }
  };

  const displayValue = formatNationalDigits(nationalNumber, country);
  const isComplete = nationalNumber.length === maxDigits;

  return (
    <div
      className={cn(
        'flex items-center w-full rounded-xl border bg-surface-muted/50 text-foreground transition-all relative overflow-hidden',
        error
          ? 'border-rose-500 ring-1 ring-rose-500/30'
          : 'border-border focus-within:border-fairway-600 focus-within:ring-1 focus-within:ring-fairway-600',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {/* 1. Country Selector on Left: Flag + Calling Code (e.g. 🇮🇳 +91) */}
      <CountrySelectComponent
        value={country}
        onChange={handleCountryChange}
        disabled={disabled}
      />

      {/* 2. National Phone Input: ONLY shows national digits, NEVER country code */}
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        disabled={disabled}
        placeholder={cleanPlaceholder}
        value={displayValue}
        onChange={handleInputChange}
        className="w-full bg-transparent px-3 py-2 text-xs font-mono text-foreground placeholder:text-foreground-muted outline-none border-none focus:outline-none focus:ring-0 min-w-0 flex-1"
        {...props}
      />

      {/* 3. Country-Wise Digit Indicator (e.g. 10/10 for India) */}
      {nationalNumber.length > 0 && (
        <div className="pr-3 pl-1 flex items-center shrink-0 select-none">
          <span
            className={cn(
              'text-[10px] font-mono px-1.5 py-0.5 rounded-md font-semibold transition-colors',
              isComplete
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20'
                : 'text-foreground-muted bg-surface-muted/80'
            )}
            title={`Allowed: ${maxDigits} digits for ${country}`}
          >
            {nationalNumber.length}/{maxDigits}
          </span>
        </div>
      )}
    </div>
  );
};

interface CountrySelectProps {
  value: Country;
  onChange: (country: Country) => void;
  disabled?: boolean;
}

const CountrySelectComponent: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const countryOptions = useMemo<CountryOption[]>(() => {
    const countries = getCountries();
    return countries.map((code) => {
      let callingCode = '';
      try {
        callingCode = getCountryCallingCode(code);
      } catch {
        callingCode = '';
      }
      const label = (en as Record<string, string>)[code] || code;
      return {
        value: code,
        label,
        callingCode: callingCode ? `+${callingCode}` : '',
      };
    });
  }, []);

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countryOptions;
    const q = search.toLowerCase().trim();
    return countryOptions.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.callingCode.includes(q) ||
        c.value.toLowerCase().includes(q)
    );
  }, [countryOptions, search]);

  const selectedCallingCode = useMemo(() => {
    if (!value) return '';
    try {
      return `+${getCountryCallingCode(value)}`;
    } catch {
      return '';
    }
  }, [value]);

  const Flag = value ? flags[value] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-1.5 pl-3 pr-2 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted/60 transition-colors rounded-l-xl shrink-0 border-r border-border cursor-pointer select-none outline-none"
        >
          <span className="w-5 h-3.5 rounded-[2px] overflow-hidden flex items-center justify-center shrink-0 border border-border/50 shadow-2xs [&_svg]:w-full [&_svg]:h-full [&_svg]:object-cover">
            {Flag ? (
              <Flag title={value} />
            ) : (
              <Globe className="w-3.5 h-3.5 text-foreground-muted" />
            )}
          </span>
          <span className="text-foreground text-xs font-mono font-medium">{selectedCallingCode}</span>
          <ChevronsUpDown className="w-3 h-3 text-foreground-muted opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0 bg-surface border border-border shadow-xl rounded-xl z-50 overflow-hidden"
      >
        <Command className="bg-transparent">
          <div className="p-2 border-b border-border">
            <CommandInput
              placeholder="Search country or code..."
              value={search}
              onValueChange={setSearch}
              className="h-8 text-xs bg-surface-muted/50 rounded-lg px-2 text-foreground placeholder:text-foreground-muted border-none focus:ring-0"
            />
          </div>
          <CommandList className="max-h-60 overflow-y-auto p-1 text-xs">
            <CommandEmpty className="py-4 text-center text-xs text-foreground-muted">
              No country found.
            </CommandEmpty>
            <CommandGroup>
              {filteredCountries.map((c) => {
                const CFlag = flags[c.value];
                const isSelected = c.value === value;
                return (
                  <CommandItem
                    key={c.value}
                    value={`${c.label} ${c.callingCode} ${c.value}`}
                    onSelect={() => {
                      onChange(c.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs text-foreground hover:bg-fairway-50 dark:hover:bg-fairway-950/50 hover:text-fairway-700 dark:hover:text-fairway-300 transition-colors',
                      isSelected && 'bg-fairway-50 dark:bg-fairway-950/60 text-fairway-700 dark:text-fairway-300 font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-4 h-3 rounded-[2px] overflow-hidden shrink-0 border border-border/40 [&_svg]:w-full [&_svg]:h-full [&_svg]:object-cover">
                        {CFlag ? <CFlag title={c.label} /> : null}
                      </span>
                      <span className="truncate">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-foreground-muted text-[11px]">{c.callingCode}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-fairway-600" />}
                    </div>
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

export default PhoneInput;
