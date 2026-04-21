'use client';

import * as React from 'react';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
export type TableHeadProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;
export type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
export type TableHeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement>;

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  expandable?: boolean;
  onToggleExpand?: () => void;
  selected?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  function Table({ className, ...props }, ref) {
    return (
      <table
        {...props}
        ref={ref}
        className={joinClassNames('ui-table', className)}
      />
    );
  },
);

export const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  TableHeadProps
>(function TableHead({ className, ...props }, ref) {
  return (
    <thead
      {...props}
      ref={ref}
      className={joinClassNames('ui-table__head', className)}
    />
  );
});

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(function TableBody({ className, ...props }, ref) {
  return (
    <tbody
      {...props}
      ref={ref}
      className={joinClassNames('ui-table__body', className)}
    />
  );
});

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow(
    {
      className,
      expandable = false,
      onClick,
      onToggleExpand,
      selected = false,
      ...props
    },
    ref,
  ) {
    const handleClick: React.MouseEventHandler<HTMLTableRowElement> = (
      event,
    ) => {
      onClick?.(event);

      if (!event.defaultPrevented && expandable) {
        onToggleExpand?.();
      }
    };

    return (
      <tr
        {...props}
        ref={ref}
        aria-expanded={expandable ? selected : undefined}
        className={joinClassNames(
          'ui-table__row',
          selected && 'ui-table__row-selected',
          expandable && 'ui-table__row-expandable',
          className,
        )}
        onClick={handleClick}
      />
    );
  },
);

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ className, ...props }, ref) {
    return (
      <td
        {...props}
        ref={ref}
        className={joinClassNames('ui-table__cell', className)}
      />
    );
  },
);

export const TableHeaderCell = React.forwardRef<
  HTMLTableCellElement,
  TableHeaderCellProps
>(function TableHeaderCell({ className, scope = 'col', ...props }, ref) {
  return (
    <th
      {...props}
      ref={ref}
      className={joinClassNames('ui-table__header-cell', className)}
      scope={scope}
    />
  );
});
