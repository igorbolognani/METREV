'use client';

import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  hint?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { className, error, hint, id, label, rows = 4, ...props },
    ref,
  ) {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <label className="ui-field" htmlFor={textareaId}>
        {label ? <span className="ui-field__label">{label}</span> : null}
        <textarea
          {...props}
          ref={ref}
          aria-describedby={describedBy}
          aria-invalid={Boolean(error)}
          className={joinClassNames(
            'ui-textarea',
            error && 'ui-textarea-error',
            className,
          )}
          id={textareaId}
          rows={rows}
        />
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
