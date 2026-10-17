import { Settings as SettingsType, HotkeyAction } from '../../Models/types';
import { getKeyName } from './HotkeysSection';
import {
  usePendingRecordingSettings,
  RECORDING_SETTING_GROUPS,
} from '../../Hooks/usePendingRecordingSettings';
import { useI18n } from '../../Context/I18nContext';

interface CaptureModeSectionProps {
  settings: SettingsType;
  updateSettings: (updates: Partial<SettingsType>) => void;
}

export default function CaptureModeSection({ settings, updateSettings }: CaptureModeSectionProps) {
  const { t, language } = useI18n();
  const hasPendingChanges = usePendingRecordingSettings(RECORDING_SETTING_GROUPS.captureMode);
  const bufferLength = formatBufferLength(settings.replayBufferDuration, t);
  const hotkeyFor = (action: HotkeyAction, fallback: string) => {
    const hotkey = settings.keybindings.find(
      (k) => k.action === action && k.enabled && k.keys.length > 0,
    );
    return hotkey ? (
      <kbd className="kbd kbd-xs px-1.5">{hotkey.keys.map(getKeyName).join(' + ')}</kbd>
    ) : (
      fallback
    );
  };
  const saveHotkey = hotkeyFor(
    HotkeyAction.SaveReplayBuffer,
    t('settings.captureMode.saveHotkeyFallback'),
  );

  return (
    <div className="p-4 bg-base-300 rounded-lg shadow-md border border-base-400">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-semibold">{t('settings.captureMode.title')}</h2>
        {hasPendingChanges && (
          <span className="text-xs text-warning">
            {t('settings.captureMode.appliesToNextRecording')}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div
          className={`bg-base-200 p-4 rounded-lg flex flex-col transition-all transition-200 border ${settings.recordingMode == 'Session' ? 'border-primary' : 'border-base-400'} cursor-pointer hover:bg-base-300`}
          onClick={() => updateSettings({ recordingMode: 'Session' })}
        >
          <div className="text-lg font-semibold mb-3">
            {t('settings.captureMode.sessionRecording')}
          </div>
          <div className="text-sm text-left">
            <p>
              <span className="opacity-70">{t('settings.captureMode.sessionRecordingDesc')}</span>{' '}
              <span className="text-primary">{t('settings.captureMode.usesDiskSpace')}</span>
            </p>
          </div>
        </div>
        <div
          className={`bg-base-200 p-4 rounded-lg flex flex-col transition-all transition-200 border ${settings.recordingMode == 'Buffer' ? 'border-primary' : 'border-base-400'} cursor-pointer hover:bg-base-300`}
          onClick={() => updateSettings({ recordingMode: 'Buffer' })}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="text-lg font-semibold text-center">
              {t('settings.captureMode.replayBuffer')}
            </div>
          </div>
          <div className="text-sm text-left">
            <p>
              <span className="opacity-70">
                {t('settings.captureMode.replayBufferDesc', { bufferLength })}
              </span>{' '}
              <span className="text-primary">{t('settings.captureMode.usesRam')}</span>
            </p>
          </div>
        </div>
        <div
          className={`bg-base-200 p-4 rounded-lg flex flex-col transition-all transition-200 border ${settings.recordingMode == 'Hybrid' ? 'border-primary' : 'border-base-400'} cursor-pointer hover:bg-base-300`}
          onClick={() => updateSettings({ recordingMode: 'Hybrid' })}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="text-lg font-semibold">{t('settings.captureMode.hybrid')}</div>
          </div>
          <div className="text-sm text-left">
            <p>
              <span className="opacity-70">
                {t('settings.captureMode.hybridDesc', { bufferLength })}
              </span>{' '}
              <span className="text-primary">{t('settings.captureMode.usesRamAndDisk')}</span>
            </p>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg border border-base-400 mt-4">
        <input
          type="checkbox"
          className="checkbox checkbox-primary checkbox-sm"
          checked={settings.alwaysOnReplayBuffer}
          onChange={(e) => updateSettings({ alwaysOnReplayBuffer: e.target.checked })}
        />
        <div>
          <div className="font-semibold">{t('settings.captureMode.alwaysOnReplayBuffer')}</div>
          <div className="text-sm opacity-70 mt-0.5">
            {language === 'pt-PT' ? (
              <>
                Mantém um buffer de repetição do seu ecrã ativo quando nenhum jogo está a gravar.
                Prima {saveHotkey} para guardar os últimos {bufferLength} como recorte.
              </>
            ) : (
              <>
                Keeps a replay buffer of your display running when no game is recording. Press{' '}
                {saveHotkey} to save the last {bufferLength} as a clip.
              </>
            )}
          </div>
        </div>
      </label>
      <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg border border-base-400 mt-3">
        <input
          type="checkbox"
          className="checkbox checkbox-primary checkbox-sm"
          checked={settings.autoClipKills ?? true}
          onChange={(e) => updateSettings({ autoClipKills: e.target.checked })}
        />
        <div>
          <div className="font-semibold flex items-center gap-2">
            <span>{t('settings.captureMode.autoClipKills')}</span>
            <span className="badge badge-primary badge-sm">Auto-Clip</span>
          </div>
          <div className="text-sm opacity-70 mt-0.5">
            {t('settings.captureMode.autoClipKillsDesc')}
          </div>
        </div>
      </label>
    </div>
  );
}

function formatBufferLength(seconds: number, t: (key: any, params?: any) => string): string {
  if (seconds < 60) return `${seconds} ${t('common.seconds')}`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const minutesText = `${minutes} ${minutes === 1 ? t('common.minute') : t('common.minutes')}`;
  return rest === 0
    ? minutesText
    : `${minutesText} ${rest} ${rest === 1 ? t('common.second') : t('common.seconds')}`;
}
