import { useState } from 'react';
import { VolumeX, Volume2, Play } from 'lucide-react';
import CloudBadge from '../CloudBadge';
import DropdownSelect from '../DropdownSelect';
import RangeSlider from '../RangeSlider';
import {
  CloseButtonAction,
  Settings as SettingsType,
  StartupWindowMode,
  InGameNotificationPosition,
  InGameNotificationSize,
} from '../../Models/types';
import { sendMessageToBackend } from '../../Utils/MessageUtils';
import { useAppState } from '../../Context/AppStateContext';
import { useI18n, Language } from '../../Context/I18nContext';

interface PreferencesSectionProps {
  settings: SettingsType;
  updateSettings: (updates: Partial<SettingsType>) => void;
}

export default function PreferencesSection({ settings, updateSettings }: PreferencesSectionProps) {
  const { t, language, setLanguage, supportedLanguages } = useI18n();
  const appState = useAppState();
  const [draggingSoundVolume, setDraggingSoundVolume] = useState<number | null>(null);
  const soundVolume = draggingSoundVolume ?? settings.soundEffectsVolume;

  const interfaceToggles: {
    key:
      | 'showGameBackground'
      | 'showAudioWaveformInTimeline'
      | 'showNewBadgeOnVideos'
      | 'confirmBeforeDeleting'
      | 'showInGameNotifications';
    label: React.ReactNode;
    description: string;
  }[] = [
    {
      key: 'showInGameNotifications',
      label: t('settings.preferences.showInGameNotifications'),
      description: t('settings.preferences.showInGameNotificationsDesc'),
    },
    {
      key: 'showGameBackground',
      label: (
        <>
          {t('settings.preferences.showGameCovers')} <CloudBadge />
        </>
      ),
      description: t('settings.preferences.showGameCoversDesc'),
    },
    {
      key: 'showAudioWaveformInTimeline',
      label: t('settings.preferences.showAudioWaveform'),
      description: t('settings.preferences.showAudioWaveformDesc'),
    },
    {
      key: 'showNewBadgeOnVideos',
      label: (
        <>
          {language === 'pt-PT' ? 'Mostrar Etiqueta' : 'Show'}
          <span className="badge badge-primary badge-sm text-base-300 mx-1">{t('common.new')}</span>
          {language === 'pt-PT' ? '' : 'Badge'}
        </>
      ),
      description: t('settings.preferences.showNewBadgeDesc'),
    },
    {
      key: 'confirmBeforeDeleting',
      label: t('settings.preferences.confirmBeforeDeleting'),
      description: t('settings.preferences.confirmBeforeDeletingDesc'),
    },
  ];

  return (
    <>
      <div className="p-4 bg-base-300 rounded-lg shadow-md border border-base-400">
        <h2 className="text-xl font-semibold mb-4">{t('settings.preferences.app')}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-control col-span-2">
            <label className="label">
              <span className="label-text text-base-content font-medium">
                {t('settings.preferences.language')}
              </span>
            </label>
            <DropdownSelect
              items={supportedLanguages.map((lang) => ({
                value: lang.code,
                label: lang.label,
              }))}
              value={language}
              onChange={(val) => setLanguage(val as Language)}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-base-content">
                {t('settings.preferences.runOnStartup')}
              </span>
            </label>
            <DropdownSelect
              items={[
                { value: 'Off', label: t('settings.preferences.dontStart') },
                { value: 'Minimized', label: t('settings.preferences.startMinimized') },
                { value: 'Normal', label: t('settings.preferences.startNormal') },
              ]}
              value={settings.runOnStartup ? settings.startupWindowMode : 'Off'}
              onChange={(val) =>
                val === 'Off'
                  ? updateSettings({ runOnStartup: false })
                  : updateSettings({
                      runOnStartup: true,
                      startupWindowMode: val as StartupWindowMode,
                    })
              }
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-base-content">
                {t('settings.preferences.closeButton')}
              </span>
            </label>
            <DropdownSelect
              items={[
                {
                  value: 'Minimize',
                  // Linux has no tray; launching Segra again brings the window back
                  label:
                    appState.platform === 'linux'
                      ? t('settings.preferences.keepRunningInBackground')
                      : t('settings.preferences.minimizeToTray'),
                },
                { value: 'Exit', label: t('settings.preferences.closeApp') },
              ]}
              value={settings.closeButtonAction}
              onChange={(val) => updateSettings({ closeButtonAction: val as CloseButtonAction })}
            />
          </div>
        </div>

        <label className="label mt-4">
          <span className="label-text text-base-content">
            {t('settings.preferences.soundEffectsVolume')}
            {draggingSoundVolume !== null && ` (${Math.round(draggingSoundVolume * 100)}%)`}
          </span>
        </label>
        <div className="flex items-center gap-3">
          <VolumeX className="w-4 h-4 opacity-70 shrink-0" />
          <RangeSlider
            name="soundEffectsVolume"
            min="0"
            max="2"
            step="0.02"
            value={soundVolume}
            onChange={(e) => {
              setDraggingSoundVolume(parseFloat(e.target.value));
            }}
            onMouseDown={(e) => setDraggingSoundVolume(parseFloat(e.currentTarget.value))}
            onMouseUp={(e) => {
              updateSettings({ soundEffectsVolume: parseFloat(e.currentTarget.value) });
              setDraggingSoundVolume(null);
            }}
            onTouchEnd={() => {
              updateSettings({
                soundEffectsVolume: draggingSoundVolume ?? settings.soundEffectsVolume,
              });
              setDraggingSoundVolume(null);
            }}
            className="w-48"
          />
          <Volume2 className="w-4 h-4 opacity-70 shrink-0" />
        </div>
      </div>

      <div className="p-4 bg-base-300 rounded-lg shadow-md border border-base-400">
        <h2 className="text-xl font-semibold mb-4">{t('settings.preferences.interface')}</h2>
        <div className="flex flex-col gap-3">
          {interfaceToggles.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex flex-col bg-base-200 rounded-lg border border-base-400 overflow-hidden"
            >
              <label className="flex items-center gap-3 cursor-pointer p-3">
                <input
                  type="checkbox"
                  name={key}
                  checked={settings[key]}
                  onChange={(e) => updateSettings({ [key]: e.target.checked })}
                  className="checkbox checkbox-primary checkbox-sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1 font-semibold">{label}</div>
                  <div className="text-sm opacity-70 mt-0.5">{description}</div>
                </div>
              </label>

              {key === 'showInGameNotifications' && settings.showInGameNotifications && (
                <div className="p-3 pt-2 border-t border-base-400/50 bg-base-300/40 flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text font-medium text-xs">
                          {t('settings.preferences.inGameNotificationPosition')}
                        </span>
                      </label>
                      <DropdownSelect
                        items={[
                          { value: 'TopRight', label: t('settings.preferences.posTopRight') },
                          { value: 'TopLeft', label: t('settings.preferences.posTopLeft') },
                          { value: 'BottomRight', label: t('settings.preferences.posBottomRight') },
                          { value: 'BottomLeft', label: t('settings.preferences.posBottomLeft') },
                        ]}
                        value={settings.inGameNotificationPosition || 'TopRight'}
                        onChange={(val) =>
                          updateSettings({
                            inGameNotificationPosition: val as InGameNotificationPosition,
                          })
                        }
                      />
                    </div>

                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text font-medium text-xs">
                          {t('settings.preferences.inGameNotificationSize')}
                        </span>
                      </label>
                      <DropdownSelect
                        items={[
                          { value: 'Small', label: t('settings.preferences.sizeSmall') },
                          { value: 'Medium', label: t('settings.preferences.sizeMedium') },
                          { value: 'Large', label: t('settings.preferences.sizeLarge') },
                        ]}
                        value={settings.inGameNotificationSize || 'Medium'}
                        onChange={(val) =>
                          updateSettings({
                            inGameNotificationSize: val as InGameNotificationSize,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline btn-primary gap-2"
                      onClick={() => sendMessageToBackend('TestInGameNotification')}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {t('settings.preferences.testNotification')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
