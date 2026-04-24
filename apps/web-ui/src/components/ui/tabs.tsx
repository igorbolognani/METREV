'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface TabsItem {
  badge?: string | number;
  disabled?: boolean;
  label: string;
  value: string;
}

export interface TabsProps {
  children?: React.ReactNode;
  className?: string;
  defaultValue?: string;
  label?: string;
  listClassName?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  items: ReadonlyArray<TabsItem>;
  value?: string;
}

export function Tabs({
  children,
  className,
  defaultValue,
  items,
  label,
  listClassName,
  onValueChange,
  orientation = 'horizontal',
  value,
}: TabsProps) {
  const selectedValue = value ?? defaultValue ?? items[0]?.value;

  return (
    <TabsPrimitive.Root
      className={joinClassNames('ui-tabs', className)}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      orientation={orientation}
      value={value}
    >
      <TabsPrimitive.List
        aria-label={label}
        className={joinClassNames('ui-tabs__list', 'wb-tablist', listClassName)}
      >
        {items.map((item) => {
          const selected = item.value === selectedValue;

          return (
            <TabsPrimitive.Trigger
              className={joinClassNames(
                'ui-tabs__trigger',
                'wb-tab',
                selected && 'active',
              )}
              data-selected={selected || undefined}
              disabled={item.disabled}
              key={item.value}
              value={item.value}
            >
              <span>{item.label}</span>
              {item.badge !== undefined ? (
                <span
                  className={joinClassNames('ui-tabs__badge', 'wb-tab-badge')}
                >
                  {item.badge}
                </span>
              ) : null}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      {...props}
      ref={ref}
      className={joinClassNames('ui-tabs__content', className)}
    />
  );
});
