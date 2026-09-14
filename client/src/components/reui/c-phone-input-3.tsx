import * as React from 'react';
import { PhoneInput, PhoneInputProps } from '@/components/reui/phone-input';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/modules/core/lib/utils';

export interface CPhoneInput3Props extends PhoneInputProps {
  label?: string;
  errorText?: string;
  helperText?: string;
  required?: boolean;
}

/**
 * CPhoneInput3 - @reui/c-phone-input-3
 * Large phone input with country selector flag popover and formatting
 */
export const CPhoneInput3: React.FC<CPhoneInput3Props> = ({
  label,
  errorText,
  helperText,
  required,
  className,
  error,
  ...props
}) => {
  const isInvalid = Boolean(error || errorText);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-xs font-semibold text-foreground block">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <PhoneInput
        error={isInvalid}
        className={cn('h-9.5 text-xs shadow-2xs', className)}
        {...props}
      />
      {errorText && (
        <p className="text-[11px] text-rose-500 font-medium mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorText}</span>
        </p>
      )}
      {!errorText && helperText && (
        <p className="text-[11px] text-foreground-muted">{helperText}</p>
      )}
    </div>
  );
};

export { PhoneInput };
export default CPhoneInput3;
