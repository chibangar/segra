import { Info } from 'lucide-react';
import { usePendingRecordingSettings } from '../../Hooks/usePendingRecordingSettings';
import { useI18n } from '../../Context/I18nContext';

// Shown while a recording runs with settings that were changed after it started
export default function PendingRecordingSettingsBanner() {
  const { t } = useI18n();
  const hasPendingChanges = usePendingRecordingSettings();
  if (!hasPendingChanges) return null;

  return (
    <div
      className="bg-base-300 border border-warning/60 rounded-lg px-4 py-3 text-sm flex items-center gap-3"
      role="status"
    >
      <Info className="h-5 w-5 shrink-0 text-warning" />
      <span className="min-w-0 flex-1">{t('settings.pendingRecordingSettings')}</span>
    </div>
  );
}
