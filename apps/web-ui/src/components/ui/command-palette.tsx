'use client';

import { Command } from 'cmdk';

export interface CommandPaletteItem {
  disabled?: boolean;
  group?: string;
  hint?: string;
  id: string;
  keywords?: string[];
  label: string;
  onSelect: () => void;
  shortcut?: string;
}

export interface CommandPaletteProps {
  emptyMessage?: string;
  items: CommandPaletteItem[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  placeholder?: string;
  title?: string;
}

export function CommandPalette({
  emptyMessage = 'No matching actions.',
  items,
  onOpenChange,
  open,
  placeholder = 'Search actions, routes, and filters...',
  title = 'Workspace command palette',
}: CommandPaletteProps) {
  const groupedItems = items.reduce<Map<string, CommandPaletteItem[]>>(
    (groups, item) => {
      const key = item.group ?? '';
      const currentItems = groups.get(key) ?? [];

      currentItems.push(item);
      groups.set(key, currentItems);
      return groups;
    },
    new Map(),
  );

  return (
    <Command.Dialog
      className="command-palette__dialog"
      label={title}
      onOpenChange={onOpenChange}
      open={open}
    >
      <div className="command-palette__frame">
        <Command.Input
          className="command-palette__input"
          placeholder={placeholder}
        />
        <Command.List className="command-palette__list">
          <Command.Empty className="command-palette__empty">
            {emptyMessage}
          </Command.Empty>
          {Array.from(groupedItems.entries()).map(([group, groupItems]) => (
            <Command.Group
              className="command-palette__group"
              heading={group || undefined}
              key={group || 'ungrouped'}
            >
              {groupItems.map((item) => (
                <Command.Item
                  className="command-palette__item"
                  disabled={item.disabled}
                  key={item.id}
                  keywords={item.keywords}
                  onSelect={() => {
                    item.onSelect();
                    onOpenChange(false);
                  }}
                >
                  <span className="command-palette__item-copy">
                    <span>{item.label}</span>
                    {item.hint ? (
                      <span className="command-palette__item-hint">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                  {item.shortcut ? (
                    <span className="command-palette__item-shortcut">
                      {item.shortcut}
                    </span>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
