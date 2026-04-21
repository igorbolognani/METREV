'use client';

import * as React from 'react';

export type CardVariant = 'default' | 'muted' | 'accent';
export type CardPadding = 'sm' | 'md' | 'lg';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: CardPadding;
  variant?: CardVariant;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    children,
    className,
    interactive = false,
    padding = 'md',
    variant = 'default',
    ...props
  },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      className={joinClassNames(
        'ui-card',
        `ui-card-${variant}`,
        `ui-card-padding-${padding}`,
        interactive && 'ui-card-interactive',
        className,
      )}
      data-padding={padding}
      data-variant={variant}
    >
      {children}
    </div>
  );
});

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardHeader({ className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={joinClassNames('ui-card__header', className)}
    />
  );
});

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function CardTitle({ className, ...props }, ref) {
  return (
    <h3
      {...props}
      ref={ref}
      className={joinClassNames('ui-card__title', className)}
    />
  );
});

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return (
    <p
      {...props}
      ref={ref}
      className={joinClassNames('ui-card__description', className)}
    />
  );
});

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardContent({ className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={joinClassNames('ui-card__content', className)}
    />
  );
});

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function CardFooter({ className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={joinClassNames('ui-card__footer', className)}
    />
  );
});
