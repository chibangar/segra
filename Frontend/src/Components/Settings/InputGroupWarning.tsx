import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import Button from '../Button';
import { useAppState } from '../../Context/AppStateContext';
import { useI18n } from '../../Context/I18nContext';

const COMMAND = 'sudo usermod -aG input $USER';

// Shown on Linux Wayland when hotkeys can't read the keyboards and only work in X11 windows.
export default function InputGroupWarning() {
  const { t } = useI18n();
  const { hotkeysNeedInputGroup } = useAppState();
  const [copied, setCopied] = useState(false);
  if (!hotkeysNeedInputGroup) return null;

  return (
    <div
      className="bg-warning/10 border border-warning rounded-lg px-4 py-3 text-warning text-sm flex items-center gap-3"
      role="alert"
    >
      <TriangleAlert className="h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">
        {t('settings.inputGroup.desc', {
          command: COMMAND,
        })}
      </span>
      <Button
        variant="primary"
        size="sm"
        className="shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(COMMAND);
          setCopied(true);
        }}
      >
        {copied ? t('settings.inputGroup.copied') : t('settings.inputGroup.copy')}
      </Button>
    </div>
  );
}
