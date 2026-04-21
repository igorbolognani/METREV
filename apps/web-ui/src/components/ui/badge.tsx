'use client';

import * as React from 'react';

export type BadgeVariant =
  | 'default'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'info'
  | 'muted';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: BadgeSize;
  variant?: BadgeVariant;
}

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    { children, className, size = 'md', variant = 'default', ...props },
    ref,
  ) {
    const normalizedVariant =
      variant === 'default'
        ? 'default'
        : variant === 'pending'
          ? 'pending'
          : variant === 'accepted'
            ? 'accepted'
            : variant === 'rejected'
              ? 'rejected'
              : variant === 'info'
                ? 'info'
                : 'muted';

    return (
      <span
        {...props}
        ref={ref}
        className={joinClassNames(
          'badge',
          `badge-${normalizedVariant}`,
          `badge-${size}`,
          normalizedVariant,
          className,
        )}
        data-size={size}
        data-variant={normalizedVariant}
      >
        {children}
      </span>
    );
  },
);
