import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import {
  AlertTriangle,
  Clapperboard,
  Crown,
  Eye,
  EyeOff,
  GripVertical,
  History,
  Home,
  LucideIcon,
  Play,
  Settings as SettingsIcon,
} from 'lucide-react';
import {
  DEFAULT_MENU_ITEMS,
  MenuItemId,
  MenuItemPreference,
  menuItemHasContent,
  Settings as SettingsType,
} from '../../Models/types';
import { useAppState } from '../../Context/AppStateContext';
import { useI18n } from '../../Context/I18nContext';

interface MenuCustomizationSectionProps {
  settings: SettingsType;
  updateSettings: (updates: Partial<SettingsType>) => void;
}

const DRAG_TYPE = 'MENU_ITEM_ROW';

const MENU_ICONS: Record<MenuItemId, LucideIcon> = {
  'Full Sessions': Play,
  'Replay Buffer': History,
  Clips: Clapperboard,
  Highlights: Crown,
  Settings: SettingsIcon,
};

const getMenuItemLabel = (id: MenuItemId, t: (key: string) => string) => {
  switch (id) {
    case 'Full Sessions':
      return t('menu.fullSessions');
    case 'Replay Buffer':
      return t('menu.buffer');
    case 'Clips':
      return t('menu.clips');
    case 'Highlights':
      return t('menu.highlights');
    case 'Settings':
      return t('menu.settings');
    default:
      return id;
  }
};

interface RowProps {
  item: MenuItemPreference;
  index: number;
  isDefault: boolean;
  forceShownReason: 'content' | null;
  moveRow: (from: number, to: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onToggleVisible: (id: MenuItemId) => void;
  onSetDefault: (id: MenuItemId) => void;
}

const MenuRow: React.FC<RowProps> = ({
  item,
  index,
  isDefault,
  forceShownReason,
  moveRow,
  onDragStart,
  onDragEnd,
  onToggleVisible,
  onSetDefault,
}) => {
  const { t } = useI18n();
  const Icon = MENU_ICONS[item.id];
  const isSettings = item.id === 'Settings';
  const [visibilityCooldown, setVisibilityCooldown] = useState(false);

  const handleToggleVisible = () => {
    if (visibilityCooldown) return;
    setVisibilityCooldown(true);
    onToggleVisible(item.id);
    setTimeout(() => setVisibilityCooldown(false), 200);
  };

  const indexRef = useRef(index);
  const moveRowRef = useRef(moveRow);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  useLayoutEffect(() => {
    indexRef.current = index;
    moveRowRef.current = moveRow;
    onDragStartRef.current = onDragStart;
    onDragEndRef.current = onDragEnd;
  });

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag(
    () => ({
      type: DRAG_TYPE,
      item: () => {
        onDragStartRef.current();
        return { index: indexRef.current };
      },
      end: () => {
        onDragEndRef.current();
      },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [],
  );

  const [, dropRef] = useDrop(
    () => ({
      accept: DRAG_TYPE,
      hover: (dragged: { index: number }) => {
        if (dragged.index !== indexRef.current) {
          moveRowRef.current(dragged.index, indexRef.current);
          dragged.index = indexRef.current;
        }
      },
    }),
    [],
  );

  const rowRef = (node: HTMLDivElement | null) => {
    dragPreviewRef(node);
    dropRef(node);
  };

  const handleRef = (node: HTMLButtonElement | null) => {
    dragRef(node);
  };

  return (
    <div
      ref={rowRef}
      className={`flex items-center justify-between bg-base-200 rounded-lg py-2 px-3 border border-base-400 transition-opacity ${
        isDragging ? 'opacity-30' : 'opacity-100'
      } ${item.visible || isSettings ? '' : 'opacity-60'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          ref={handleRef}
          type="button"
          aria-label="Drag to reorder"
          className="text-base-content/60 hover:text-base-content cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <Icon className="w-5 h-5 text-base-content/80 shrink-0" />
        <span className="font-medium truncate">{getMenuItemLabel(item.id, t as any)}</span>
      </div>

      <div className="flex items-center gap-2">
        {forceShownReason === 'content' && (
          <div
            className="tooltip tooltip-warning inline-flex p-1.5 text-warning [&::before]:delay-200 [&::after]:delay-200"
            data-tip={t('settings.menuCustomization.stillShownVideos')}
            aria-label={t('settings.menuCustomization.stillShownVideos')}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}
        <div
          className="tooltip tooltip-primary inline-flex [&::before]:delay-200 [&::after]:delay-200"
          data-tip={
            isDefault
              ? t('settings.menuCustomization.opensOnLaunch')
              : !item.visible && !isSettings
                ? t('settings.menuCustomization.hiddenCantOpen')
                : t('settings.menuCustomization.openOnLaunch')
          }
        >
          <button
            type="button"
            aria-label={t('settings.menuCustomization.openOnLaunch')}
            aria-pressed={isDefault}
            onClick={() => onSetDefault(item.id)}
            disabled={(!item.visible && !isSettings) || isDefault}
            className={`p-1.5 rounded transition-colors ${
              isDefault
                ? 'text-primary cursor-default'
                : 'text-base-content/80 hover:text-primary hover:bg-base-300 cursor-pointer disabled:cursor-default disabled:opacity-40 disabled:hover:text-base-content/80 disabled:hover:bg-transparent'
            }`}
          >
            <Home
              className="w-4 h-4"
              fill={isDefault ? 'currentColor' : 'none'}
              strokeWidth={isDefault ? 2 : 1.75}
            />
          </button>
        </div>
        <div
          className="tooltip tooltip-primary inline-flex [&::before]:delay-200 [&::after]:delay-200"
          data-tip={
            isSettings
              ? t('settings.menuCustomization.alwaysShown')
              : item.visible
                ? t('settings.menuCustomization.hideFromSidebar')
                : t('settings.menuCustomization.showInSidebar')
          }
        >
          <button
            type="button"
            aria-label={
              item.visible || isSettings
                ? t('settings.menuCustomization.hideFromSidebar')
                : t('settings.menuCustomization.showInSidebar')
            }
            onClick={handleToggleVisible}
            disabled={isSettings}
            className={`p-1.5 rounded transition-colors ${
              isSettings
                ? 'cursor-default text-base-content/50'
                : 'cursor-pointer text-base-content/80 hover:text-primary hover:bg-base-300'
            }`}
          >
            {item.visible || isSettings ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const sameOrder = (a: MenuItemPreference[], b: MenuItemPreference[]) =>
  a.length === b.length && a.every((item, i) => item.id === b[i]?.id);

export default function MenuCustomizationSection({
  settings,
  updateSettings,
}: MenuCustomizationSectionProps) {
  const { t } = useI18n();
  const appState = useAppState();
  const defaultItem = settings.defaultMenuItem ?? 'Full Sessions';

  const sourceItems: MenuItemPreference[] =
    settings.menuItems && settings.menuItems.length > 0 ? settings.menuItems : DEFAULT_MENU_ITEMS;

  const [localItems, setLocalItems] = useState<MenuItemPreference[]>(sourceItems);
  const localItemsRef = useRef(localItems);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    localItemsRef.current = localItems;
  }, [localItems]);

  // Pull in external setting changes (visibility toggle, etc.) unless a drag is in progress.
  useEffect(() => {
    if (isDraggingRef.current) return;
    const next =
      settings.menuItems && settings.menuItems.length > 0 ? settings.menuItems : DEFAULT_MENU_ITEMS;
    setLocalItems(next);
  }, [settings.menuItems]);

  const moveRow = useCallback((from: number, to: number) => {
    setLocalItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    const latest = localItemsRef.current;
    const current =
      settings.menuItems && settings.menuItems.length > 0 ? settings.menuItems : DEFAULT_MENU_ITEMS;
    if (!sameOrder(latest, current)) {
      updateSettings({ menuItems: latest });
    }
  }, [settings.menuItems, updateSettings]);

  const toggleVisible = (id: MenuItemId) => {
    if (id === 'Settings') return;
    const next = sourceItems.map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item,
    );

    let nextDefault = defaultItem;
    const toggled = next.find((item) => item.id === id);
    if (toggled && !toggled.visible && defaultItem === id) {
      const newDefault = next.find((item) => item.visible);
      if (newDefault) nextDefault = newDefault.id;
    }

    updateSettings({
      menuItems: next,
      ...(nextDefault !== defaultItem ? { defaultMenuItem: nextDefault } : {}),
    });
  };

  const setDefault = (id: MenuItemId) => {
    if (id === defaultItem) return;
    const target = sourceItems.find((item) => item.id === id);
    if (!target || (!target.visible && id !== 'Settings')) return;
    updateSettings({ defaultMenuItem: id });
  };

  return (
    <div className="p-4 bg-base-300 rounded-lg shadow-md border border-base-400">
      <h2 className="text-xl font-semibold mb-1">{t('settings.menuCustomization.title')}</h2>
      <p className="text-sm opacity-70 mb-4">{t('settings.menuCustomization.description')}</p>
      <div className="space-y-2 max-w-md">
        {localItems.map((item, index) => {
          const forceShownReason: 'content' | null =
            !item.visible && item.id !== 'Settings' && menuItemHasContent(item.id, appState.content)
              ? 'content'
              : null;
          return (
            <MenuRow
              key={item.id}
              item={item}
              index={index}
              isDefault={defaultItem === item.id}
              forceShownReason={forceShownReason}
              moveRow={moveRow}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onToggleVisible={toggleVisible}
              onSetDefault={setDefault}
            />
          );
        })}
      </div>
    </div>
  );
}
