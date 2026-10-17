import { useSettings } from './Context/SettingsContext';
import { useAppState } from './Context/AppStateContext';
import RecordingCard from './Components/RecordingCard';
import CircularProgress from './Components/CircularProgress';
import { sendMessageToBackend } from './Utils/MessageUtils';
import { useUploads } from './Context/UploadContext';
import { useImports } from './Context/ImportContext';
import { useContentMigration } from './Context/ContentMigrationContext';
import { useClipping } from './Context/ClippingContext';
import { useUpdate } from './Context/UpdateContext';
import { useObsDownload } from './Context/ObsDownloadContext';
import { useAiHighlights } from './Context/AiHighlightsContext';
import UploadCard from './Components/UploadCard';
import ImportCard from './Components/ImportCard';
import ContentMigrationCard from './Components/ContentMigrationCard';
import ClippingCard from './Components/ClippingCard';
import UpdateCard from './Components/UpdateCard';
import UnavailableDeviceCard from './Components/UnavailableDeviceCard';
import StatusCardStack, { StatusCard } from './Components/StatusCardStack';
import {
  CirclePlay,
  RotateCcw,
  Scissors,
  Sparkles,
  Settings,
  OctagonX,
  Monitor,
  HardDrive,
  LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import { MenuItemId, DEFAULT_MENU_ITEMS, menuItemHasContent, HotkeyAction } from './Models/types';
import { useI18n } from './Context/I18nContext';
import { getKeyName } from './Components/Settings/HotkeysSection';

interface MenuProps {
  selectedMenu: string;
  onSelectMenu: (menu: string) => void;
}

const MENU_ICONS: Record<MenuItemId, LucideIcon> = {
  'Full Sessions': CirclePlay,
  'Replay Buffer': RotateCcw,
  Clips: Scissors,
  Highlights: Sparkles,
  Settings: Settings,
};

export default function Menu({ selectedMenu, onSelectMenu }: MenuProps) {
  const { t, language } = useI18n();
  const settings = useSettings();
  const appState = useAppState();
  const { hasLoadedObs, recording, preRecording, alwaysOnBufferActive } = appState;
  const { updateInfo } = useUpdate();
  const { aiProgress } = useAiHighlights();
  const { obsDownloadProgress } = useObsDownload();
  const { migrations: contentMigrations, isMigrating } = useContentMigration();
  const { uploads } = useUploads();
  const { imports } = useImports();
  const { clippingProgress } = useClipping();
  const [buttonCooldown, setButtonCooldown] = useState(false);

  const buttonRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [indicatorPosition, setIndicatorPosition] = useState({ top: 12 });
  const [indicatorAnimated, setIndicatorAnimated] = useState(false);

  const clipHotkey = settings.keybindings?.find(
    (h) => h.action === HotkeyAction.SaveReplayBuffer && h.enabled,
  );
  const clipKeyName =
    clipHotkey?.keys && clipHotkey.keys.length > 0
      ? clipHotkey.keys.map(getKeyName).join(' + ')
      : 'F10';

  const visibleMenuItems = useMemo(() => {
    const items =
      settings.menuItems && settings.menuItems.length > 0 ? settings.menuItems : DEFAULT_MENU_ITEMS;
    // Force-show items that contain content so the user always has a way to reach their files.
    return items.filter(
      (item) =>
        item.id === 'Settings' || item.visible || menuItemHasContent(item.id, appState.content),
    );
  }, [settings.menuItems, appState.content]);

  const computeIndicatorPosition = () => {
    if (!visibleMenuItems.some((item) => item.id === selectedMenu)) return;
    const rowEl = buttonRefs.current[selectedMenu];
    if (!rowEl) return;
    const buttonEl = rowEl.firstElementChild as HTMLElement | null;
    const buttonHeight = buttonEl?.offsetHeight || 44;
    const indicatorTop = rowEl.offsetTop + buttonHeight / 2 - 16;
    setIndicatorPosition({ top: indicatorTop });
  };

  useLayoutEffect(() => {
    computeIndicatorPosition();
    const timeoutId = setTimeout(computeIndicatorPosition, 220);
    return () => clearTimeout(timeoutId);
  }, [selectedMenu, visibleMenuItems]);

  useEffect(() => {
    setIndicatorAnimated(true);
  }, []);

  const getMenuLabel = (id: MenuItemId | string) => {
    switch (id) {
      case 'Full Sessions':
        return t('menu.fullSessions');
      case 'Replay Buffer':
        return t('menu.replayBuffer');
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

  const aiProgressValues = Object.values(aiProgress);
  const hasActiveAiHighlights = aiProgressValues.length > 0;
  const averageAiProgress = hasActiveAiHighlights
    ? Math.round(aiProgressValues.reduce((sum, p) => sum + p.progress, 0) / aiProgressValues.length)
    : 0;

  const hasUnavailableDevices = () => {
    const unavailableInput = settings.inputDevices.some(
      (deviceSetting: { id: string }) =>
        deviceSetting.id !== 'default' &&
        !appState.inputDevices.some((d) => d.id === deviceSetting.id),
    );
    const unavailableOutput = settings.outputDevices.some(
      (deviceSetting: { id: string }) =>
        deviceSetting.id !== 'default' &&
        !appState.outputDevices.some((d) => d.id === deviceSetting.id),
    );
    return unavailableInput || unavailableOutput;
  };

  const statusCards: StatusCard[] = [
    ...(updateInfo ? [{ key: 'update', node: <UpdateCard /> }] : []),
    ...Object.values(uploads).map((file) => ({
      key: `upload:${file.uploadId}`,
      node: <UploadCard upload={file} />,
    })),
    ...Object.values(imports).map((importItem) => ({
      key: `import:${importItem.id}`,
      node: <ImportCard importItem={importItem} />,
    })),
    ...Object.values(contentMigrations).map((migration) => ({
      key: `migration:${migration.id}`,
      node: <ContentMigrationCard migration={migration} />,
    })),
    ...(hasUnavailableDevices()
      ? [{ key: 'unavailable-devices', node: <UnavailableDeviceCard /> }]
      : []),
    ...(preRecording || (recording && recording.endTime == null)
      ? [
          {
            key: 'recording',
            node: <RecordingCard recording={recording} preRecording={preRecording} />,
            pinned: true,
          },
        ]
      : []),
    ...Object.values(clippingProgress).map((clipping) => ({
      key: `clip:${clipping.id}`,
      node: <ClippingCard clipping={clipping} />,
    })),
  ];

  const showAlwaysOnBuffer =
    alwaysOnBufferActive &&
    !recording &&
    !preRecording &&
    !updateInfo &&
    Object.keys(uploads).length === 0 &&
    Object.keys(imports).length === 0 &&
    Object.keys(contentMigrations).length === 0 &&
    Object.keys(clippingProgress).length === 0;

  return (
    <div className="bg-[#080a0f] w-60 h-screen flex flex-col border-r border-white/[0.07] select-none">
      {/* Brand Header & Live Clipping Status */}
      <div className="px-3.5 pt-3.5 pb-2">
        <div className="flex items-center justify-between px-1 mb-3">
          <div className="flex items-center gap-2.5">
            <img src="/icon.png" alt="Segra" className="w-6 h-6 object-contain drop-shadow" />
            <span className="font-extrabold tracking-wider text-base text-white/95">SEGRA</span>
          </div>
          <span className="text-[10px] bg-primary/15 text-primary border border-primary/30 font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
            MEDAL
          </span>
        </div>

        {/* Live Clipping Status Pill */}
        <div className="bg-[#121620]/90 border border-white/[0.08] rounded-xl px-3 py-2 flex items-center gap-2.5 text-xs shadow-inner">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                recording ? 'bg-red-400' : 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                recording ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-semibold text-white/90 truncate leading-tight">
              {recording
                ? (recording.game ? `${recording.game}` : t('menu.recording'))
                : preRecording
                  ? `${preRecording.game}`
                  : (language === 'pt-PT' ? 'Pronto a Clipar' : 'Ready to Clip')}
            </span>
            <span className="text-[10px] text-gray-400 truncate leading-tight mt-0.5">
              {recording
                ? (language === 'pt-PT' ? 'Sessão ativa' : 'Recording session')
                : `${language === 'pt-PT' ? 'Atalho' : 'Shortcut'}: ${clipKeyName}`}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Navigation Items */}
      <div className="flex flex-col px-3 text-left py-1 relative">
        {/* Selection indicator pill */}
        <div
          className={`absolute w-1 bg-primary rounded-r shadow-[0_0_8px_rgba(254,203,0,0.6)] ${
            indicatorAnimated ? 'transition-all duration-200 ease-in-out' : ''
          }`}
          style={{
            left: 0,
            top: `${indicatorPosition.top}px`,
            height: '32px',
          }}
        />
        <AnimatePresence initial={false} mode="popLayout">
          {visibleMenuItems.map(({ id }) => {
            const Icon = MENU_ICONS[id];
            const isActive = selectedMenu === id;
            const isDisabled = isMigrating && id !== 'Settings';

            return (
              <motion.div
                key={id}
                ref={(el) => {
                  buttonRefs.current[id] = el;
                }}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden pb-1.5 last:pb-0"
              >
                <button
                  disabled={isDisabled}
                  onMouseDown={() => onSelectMenu(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white/[0.08] text-primary font-semibold shadow-sm border border-white/[0.08]'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                    <span className="truncate">{getMenuLabel(id)}</span>
                  </span>
                  {id === 'Highlights' && (
                    <div className="ml-auto flex items-center">
                      <AnimatePresence>
                        {hasActiveAiHighlights && !isActive && (
                          <motion.div
                            className="flex items-center justify-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <CircularProgress
                              progress={averageAiProgress}
                              size={20}
                              strokeWidth={2}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Status Cards */}
      <StatusCardStack cards={statusCards} />

      {/* OBS Loading Section */}
      {!hasLoadedObs && obsDownloadProgress !== null && obsDownloadProgress < 100 && (
        <div className="mb-4 flex flex-col items-center px-4">
          <p className="text-center text-sm text-gray-300 mb-2">{t('menu.downloadingObs')}</p>
          <div className="w-full bg-[#121620] rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-300 shadow-[0_0_6px_rgba(254,203,0,0.4)]"
              style={{ width: `${obsDownloadProgress}%` }}
            ></div>
          </div>
          <p className="text-gray-500 text-xs mt-1">{obsDownloadProgress}%</p>
        </div>
      )}

      {/* Medal Storage Meter */}
      <div className="mx-3.5 mb-2.5 bg-[#121620]/80 border border-white/[0.06] rounded-xl p-2.5 text-xs flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-gray-400 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-gray-300">
            <HardDrive size={13} className="text-primary" />
            {language === 'pt-PT' ? 'Armazenamento' : 'Storage'}
          </span>
          <span className="font-semibold text-white/90">
            {(appState.currentFolderSizeGb ?? 0).toFixed(1)} GB
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(254,203,0,0.4)]"
            style={{
              width: `${Math.min(100, Math.max(3, ((appState.currentFolderSizeGb ?? 0) / (settings.storageLimit || 100)) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* Start and Stop Buttons */}
      <div className="relative mb-3.5 px-3.5">
        <AnimatePresence>
          {showAlwaysOnBuffer && (
            <motion.div
              key="always-on-buffer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-x-0 bottom-full mb-2 flex items-center justify-center gap-1.5 text-xs leading-none text-gray-400"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              {t('menu.replayBuffer')}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col items-center z-50">
          <button
            className={`w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
              buttonCooldown || (appState.recording && recording && recording.endTime !== null)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              appState.recording || appState.preRecording
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 animate-pulse'
                : 'bg-primary hover:bg-[#e6b800] text-black shadow-lg shadow-yellow-500/20 hover:scale-[1.01] active:scale-[0.99]'
            }`}
            disabled={
              buttonCooldown || (appState.recording && recording && recording.endTime !== null)
            }
            onClick={() => {
              if (!appState.hasLoadedObs) return;
              setButtonCooldown(true);
              setTimeout(() => setButtonCooldown(false), 1000);
              sendMessageToBackend(
                appState.recording || appState.preRecording ? 'StopRecording' : 'StartRecording',
              );
            }}
          >
            {appState.recording || appState.preRecording ? (
              <>
                <OctagonX className="w-4 h-4" />
                {t('menu.stopRecording')}
              </>
            ) : (
              <>
                <Monitor className="w-4 h-4" />
                {t('menu.displayCapture')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
