'use client';

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface ScrollAreaProps extends React.ComponentPropsWithoutRef<
  typeof ScrollAreaPrimitive.Root
> {
  maxHeight?: number | string;
  viewportClassName?: string;
}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  function ScrollArea(
    { children, className, maxHeight, style, viewportClassName, ...props },
    ref,
  ) {
    return (
      <ScrollAreaPrimitive.Root
        {...props}
        ref={ref}
        className={joinClassNames('ui-scroll-area', className)}
        style={{ ...style, maxHeight }}
      >
        <ScrollAreaPrimitive.Viewport
          className={joinClassNames(
            'ui-scroll-area__viewport',
            viewportClassName,
          )}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
          className="ui-scroll-area__scrollbar"
          orientation="vertical"
        >
          <ScrollAreaPrimitive.Thumb className="ui-scroll-area__thumb" />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Scrollbar
          className="ui-scroll-area__scrollbar"
          orientation="horizontal"
        >
          <ScrollAreaPrimitive.Thumb className="ui-scroll-area__thumb" />
        </ScrollAreaPrimitive.Scrollbar>
        <ScrollAreaPrimitive.Corner className="ui-scroll-area__corner" />
      </ScrollAreaPrimitive.Root>
    );
  },
);
