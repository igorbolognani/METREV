'use client';

import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

export type ButtonVariant =
  | 'default'
  | 'outline'
  | 'ghost'
  | 'subtle'
  | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      asChild = false,
      children,
      className,
      disabled,
      loading = false,
      size = 'md',
      type,
      variant = 'default',
      ...props
    },
    ref,
  ) {
    const classes = joinClassNames(
      'btn',
      `btn-${variant}`,
      `btn-${size}`,
      loading && 'is-loading',
      className,
    );

    if (asChild) {
      return (
        <Slot
          {...props}
          ref={ref as React.ForwardedRef<HTMLElement>}
          aria-busy={loading || undefined}
          aria-disabled={disabled || loading || undefined}
          className={classes}
          data-size={size}
          data-variant={variant}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        {...props}
        ref={ref}
        aria-busy={loading || undefined}
        className={classes}
        data-size={size}
        data-variant={variant}
        disabled={disabled || loading}
        type={type ?? 'button'}
      >
        {children}
      </button>
    );
  },
);
