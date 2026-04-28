'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface DialogProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
  description?: string;
  footer?: React.ReactNode;
  headerAccessory?: React.ReactNode;
  hideClose?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title: string;
  trigger?: React.ReactNode;
}

export function Dialog({
  children,
  className,
  contentClassName,
  defaultOpen,
  description,
  footer,
  headerAccessory,
  hideClose = false,
  onOpenChange,
  open,
  title,
  trigger,
}: DialogProps) {
  return (
    <DialogPrimitive.Root
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
    >
      {trigger ? (
        React.isValidElement(trigger) ? (
          <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
        ) : (
          <DialogPrimitive.Trigger>{trigger}</DialogPrimitive.Trigger>
        )
      ) : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-dialog__overlay" />
        <DialogPrimitive.Content
          className={joinClassNames(
            'ui-dialog__content',
            className,
            contentClassName,
          )}
        >
          <div className="ui-dialog__header">
            <div className="ui-dialog__copy">
              <DialogPrimitive.Title className="ui-dialog__title">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="ui-dialog__description">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            {headerAccessory || !hideClose ? (
              <div className="ui-dialog__actions">
                {headerAccessory ? (
                  <div className="ui-dialog__header-accessory">
                    {headerAccessory}
                  </div>
                ) : null}
                {!hideClose ? (
                  <DialogPrimitive.Close
                    className="ui-dialog__close"
                    type="button"
                  >
                    Close
                  </DialogPrimitive.Close>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="ui-dialog__body">{children}</div>
          {footer ? <div className="ui-dialog__footer">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
