'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface SelectOption {
  description?: string;
  disabled?: boolean;
  label: string;
  value: string;
}

export interface SelectProps {
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  label?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
}

export function Select({
  className,
  defaultValue,
  disabled = false,
  error,
  hint,
  label,
  name,
  onValueChange,
  options,
  placeholder = 'Select an option',
  value,
}: SelectProps) {
  const generatedId = React.useId();
  const triggerId = `${generatedId}-trigger`;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={joinClassNames('ui-field', className)}>
      {label ? (
        <label className="ui-field__label" htmlFor={triggerId}>
          {label}
        </label>
      ) : null}
      <SelectPrimitive.Root
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        onValueChange={onValueChange}
        value={value}
      >
        <SelectPrimitive.Trigger
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={joinClassNames('ui-select', error && 'ui-select-error')}
          id={triggerId}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ui-select__icon">
            v
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="ui-select__content"
            position="popper"
          >
            <SelectPrimitive.Viewport className="ui-select__viewport">
              {options.map((option) => (
                <SelectPrimitive.Item
                  className="ui-select__item"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <span className="ui-select__item-copy">
                    <SelectPrimitive.ItemText>
                      {option.label}
                    </SelectPrimitive.ItemText>
                    {option.description ? (
                      <span className="ui-select__item-description">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {hint ? (
        <span className="ui-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="ui-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
