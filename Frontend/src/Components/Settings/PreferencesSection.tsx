import { useState } from 'react';
import { VolumeX, Volume2 } from 'lucide-react';
import CloudBadge from '../CloudBadge';
import DropdownSelect from '../DropdownSelect';
import RangeSlider from '../RangeSlider';
import { CloseButtonAction, Settings as SettingsType, StartupWindowMode } from '../../Models/types';
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
      | 'confirmBeforeDeleting';
    label: React.ReactNode;
    description: string;
  }[] = [
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
            <label
              key={key}
              className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg border border-base-400"
            >
              <input
                type="checkbox"
                name={key}
                checked={settings[key]}
                onChange={(e) => updateSettings({ [key]: e.target.checked })}
                className="checkbox checkbox-primary checkbox-sm"
              />
              <div>
                <div className="flex items-center gap-1 font-semibold">{label}</div>
                <div className="text-sm opacity-70 mt-0.5">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
