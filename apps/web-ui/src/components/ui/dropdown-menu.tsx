'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export type DropdownMenuItemVariant = 'default' | 'destructive';

export interface DropdownMenuItem {
  disabled?: boolean;
  icon?: React.ReactNode;
  id?: string;
  label: string;
  onSelect?: () => void;
  separatorBefore?: boolean;
  shortcut?: string;
  variant?: DropdownMenuItemVariant;
}

export interface DropdownMenuProps {
  align?: 'center' | 'end' | 'start';
  className?: string;
  items: DropdownMenuItem[];
  trigger: React.ReactNode;
}

export function DropdownMenu({
  align = 'end',
  className,
  items,
  trigger,
}: DropdownMenuProps) {
  return (
    <DropdownMenuPrimitive.Root>
      {React.isValidElement(trigger) ? (
        <DropdownMenuPrimitive.Trigger asChild>
          {trigger}
        </DropdownMenuPrimitive.Trigger>
      ) : (
        <DropdownMenuPrimitive.Trigger>{trigger}</DropdownMenuPrimitive.Trigger>
      )}
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          className={joinClassNames('ui-dropdown-menu__content', className)}
          sideOffset={8}
        >
          {items.map((item) => (
            <React.Fragment key={item.id ?? item.label}>
              {item.separatorBefore ? (
                <DropdownMenuPrimitive.Separator className="ui-dropdown-menu__separator" />
              ) : null}
              <DropdownMenuPrimitive.Item
                className={joinClassNames(
                  'ui-dropdown-menu__item',
                  item.variant === 'destructive' &&
                    'ui-dropdown-menu__item-destructive',
                )}
                disabled={item.disabled}
                onSelect={() => item.onSelect?.()}
              >
                <span className="ui-dropdown-menu__item-copy">
                  {item.icon ? (
                    <span className="ui-dropdown-menu__icon">{item.icon}</span>
                  ) : null}
                  <span>{item.label}</span>
                </span>
                {item.shortcut ? (
                  <span className="ui-dropdown-menu__shortcut">
                    {item.shortcut}
                  </span>
                ) : null}
              </DropdownMenuPrimitive.Item>
            </React.Fragment>
          ))}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
