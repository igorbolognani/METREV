'use client';

import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

function parseChips(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasChip(chips: string[], candidate: string): boolean {
  return chips.some(
    (entry) => entry.toLocaleLowerCase() === candidate.toLocaleLowerCase(),
  );
}

function serializeChips(chips: string[]): string {
  return chips.join(', ');
}

export interface ChipInputProps {
  className?: string;
  error?: string;
  hint?: string;
  label?: string;
  maxItems?: number;
  onValueChange: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  value: string;
}

export function ChipInput({
  className,
  error,
  hint,
  label,
  maxItems,
  onValueChange,
  placeholder,
  suggestions = [],
  value,
}: ChipInputProps) {
  const [draftValue, setDraftValue] = React.useState('');
  const generatedId = React.useId();
  const inputId = `${generatedId}-input`;
  const hintId = hint ? `${generatedId}-hint` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const chips = React.useMemo(() => parseChips(value), [value]);
  const availableSuggestions = React.useMemo(
    () => suggestions.filter((entry) => !hasChip(chips, entry)).slice(0, 6),
    [chips, suggestions],
  );

  function commitChip(rawValue: string) {
    const normalizedValue = rawValue.trim();
    if (!normalizedValue) {
      setDraftValue('');
      return;
    }

    const nextChips =
      maxItems === 1
        ? [normalizedValue]
        : hasChip(chips, normalizedValue)
          ? chips
          : [...chips, normalizedValue].slice(0, maxItems ?? undefined);

    onValueChange(serializeChips(nextChips));
    setDraftValue('');
  }

  function removeChip(chip: string) {
    onValueChange(serializeChips(chips.filter((entry) => entry !== chip)));
  }

  return (
    <div className={joinClassNames('ui-field', className)}>
      {label ? (
        <label className="ui-field__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div
        className={joinClassNames(
          'ui-chip-input',
          error && 'ui-chip-input-error',
        )}
      >
        <div className="ui-chip-input__chips">
          {chips.map((chip) => (
            <span className="ui-chip-input__chip" key={chip}>
              <span>{chip}</span>
              <button
                aria-label={`Remove ${chip}`}
                className="ui-chip-input__remove"
                onClick={() => removeChip(chip)}
                type="button"
              >
                ×
              </button>
            </span>
          ))}
          {maxItems !== 1 || chips.length === 0 ? (
            <input
              aria-describedby={describedBy}
              aria-invalid={Boolean(error)}
              className="ui-chip-input__control"
              id={inputId}
              onBlur={() => commitChip(draftValue)}
              onChange={(event) => setDraftValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  commitChip(draftValue);
                }

                if (event.key === 'Backspace' && !draftValue) {
                  const lastChip = chips.at(-1);
                  if (lastChip) {
                    removeChip(lastChip);
                  }
                }
              }}
              placeholder={placeholder}
              value={draftValue}
            />
          ) : null}
        </div>
      </div>
      {availableSuggestions.length > 0 ? (
        <div className="ui-chip-input__suggestions">
          {availableSuggestions.map((entry) => (
            <button
              className="ui-chip-input__suggestion"
              key={entry}
              onClick={() => commitChip(entry)}
              type="button"
            >
              {entry}
            </button>
          ))}
        </div>
      ) : null}
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
