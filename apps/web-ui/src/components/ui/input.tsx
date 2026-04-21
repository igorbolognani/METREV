'use client';

import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  error?: string;
  hint?: string;
  inputClassName?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  unit?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      error,
      hint,
      id,
      inputClassName,
      label,
      size = 'md',
      unit,
      ...props
    },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <label
        className={joinClassNames('ui-field', className)}
        htmlFor={inputId}
      >
        {label ? <span className="ui-field__label">{label}</span> : null}
        <span
          className={joinClassNames(
            'ui-input-row',
            `ui-input-row-${size}`,
            unit && 'ui-input-row-with-unit',
            error && 'ui-input-row-error',
          )}
        >
          <input
            {...props}
            ref={ref}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
            className={joinClassNames('ui-input', inputClassName)}
            id={inputId}
          />
          {unit ? <span className="ui-input-unit">{unit}</span> : null}
        </span>
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
      </label>
    );
  },
);
