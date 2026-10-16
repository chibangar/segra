import { TriangleAlert } from 'lucide-react';
import Button from '../Button';
import { useAppState } from '../../Context/AppStateContext';
import { sendMessageToBackend } from '../../Utils/MessageUtils';
import { useI18n } from '../../Context/I18nContext';

// Shown only when the automatic install of the elevated-hotkey helper was declined or failed.
export default function HotkeyBrokerWarning() {
  const { t } = useI18n();
  const { hotkeyBroker } = useAppState();
  if (!hotkeyBroker?.actionRequired) return null;

  return (
    <div
      className="bg-warning/10 border border-warning rounded-lg px-4 py-3 text-warning text-sm flex items-center gap-3"
      role="alert"
    >
      <TriangleAlert className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">
        {hotkeyBroker.installed
          ? t('settings.hotkeyBroker.updateDesc')
          : t('settings.hotkeyBroker.installDesc')}
      </span>
      <Button
        variant="primary"
        size="sm"
        className="shrink-0"
        onClick={() => sendMessageToBackend('InstallHotkeyBroker')}
      >
        {hotkeyBroker.installed
          ? t('settings.hotkeyBroker.update')
          : t('settings.hotkeyBroker.install')}
      </Button>
    </div>
  );
}
