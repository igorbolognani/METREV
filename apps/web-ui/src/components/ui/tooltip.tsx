'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  content: React.ReactNode;
  side?: 'bottom' | 'left' | 'right' | 'top';
}

export function Tooltip({
  children,
  className,
  content,
  side = 'top',
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={120}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={className ?? 'ui-tooltip'}
            side={side}
          >
            {content}
            <TooltipPrimitive.Arrow className="ui-tooltip__arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
