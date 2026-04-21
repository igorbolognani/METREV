'use client';

import type { CheckedState } from '@radix-ui/react-checkbox';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface CheckboxProps {
  checked?: CheckedState;
  className?: string;
  defaultChecked?: CheckedState;
  description?: string;
  disabled?: boolean;
  label: string;
  name?: string;
  onCheckedChange?: (checked: CheckedState) => void;
  required?: boolean;
  value?: string;
}

export function Checkbox({
  checked,
  className,
  defaultChecked,
  description,
  disabled = false,
  label,
  name,
  onCheckedChange,
  required,
  value,
}: CheckboxProps) {
  return (
    <label className={joinClassNames('ui-checkbox-row', className)}>
      <CheckboxPrimitive.Root
        checked={checked}
        className="ui-checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        name={name}
        onCheckedChange={onCheckedChange}
        required={required}
        value={value}
      >
        <CheckboxPrimitive.Indicator className="ui-checkbox__indicator">
          x
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="ui-checkbox__copy">
        <span className="ui-checkbox__label">{label}</span>
        {description ? (
          <span className="ui-checkbox__description">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
