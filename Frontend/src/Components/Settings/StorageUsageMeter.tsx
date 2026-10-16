import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Content, ContentType, State } from '../../Models/types';
import { useI18n } from '../../Context/I18nContext';

const TYPE_COLORS: Record<ContentType, string> = {
  Session: '#3987e5',
  Buffer: '#d95926',
  Clip: '#199e70',
  Highlight: '#c98500',
};

const OTHER_COLOR = '#49515b';

const TYPE_ORDER: ContentType[] = ['Session', 'Buffer', 'Clip', 'Highlight'];

const normalizePath = (path: string) => path.replace(/\\/g, '/').replace(/\/+$/, '');

const formatGb = (value: number) => {
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
};

// "E:/Segra" -> "Drive E:". Linux paths have no letter, so they fall back to "Disk".
const driveLabel = (contentFolder: string, diskLabel: string) => {
  const match = /^([a-zA-Z]):/.exec(contentFolder.trim());
  return match ? `Drive ${match[1].toUpperCase()}:` : diskLabel;
};

interface Segment {
  key: string;
  label: string;
  color: string;
  gb: number;
}

interface StorageUsageMeterProps {
  content: Content[];
  contentFolder: string;
  storageLimitGb: number;
  usedGb: number;
  driveUsedGb: State['recordingDriveUsedGb'];
  driveFreeGb: State['recordingDriveFreeGb'];
}

export default function StorageUsageMeter({
  content,
  contentFolder,
  storageLimitGb,
  usedGb,
  driveUsedGb,
  driveFreeGb,
}: StorageUsageMeterProps) {
  const { t } = useI18n();

  const typeLabels: Record<ContentType, string> = {
    Session: t('settings.storage.sessions'),
    Buffer: t('settings.storage.buffers'),
    Clip: t('settings.storage.clips'),
    Highlight: t('settings.storage.highlights'),
  };

  const segments = useMemo<Segment[]>(() => {
    // Imported content can live outside the recording path and isn't counted against
    // the limit, so the breakdown has to match what the limit actually measures.
    const root = normalizePath(contentFolder.trim()).toLowerCase();
    const inside = root
      ? content.filter((c) =>
          normalizePath(c.filePath || '')
            .toLowerCase()
            .startsWith(root + '/'),
        )
      : [];

    const byType = TYPE_ORDER.map((type) => ({
      key: type,
      label: typeLabels[type],
      color: TYPE_COLORS[type],
      gb:
        inside.filter((c) => c.type === type).reduce((sum, c) => sum + (c.fileSizeKb || 0), 0) /
        (1024 * 1024),
    }));

    // Whatever the folder holds beyond tracked content: orphaned files, stray videos.
    const tracked = byType.reduce((sum, s) => sum + s.gb, 0);
    const other = Math.max(0, usedGb - tracked);

    return [
      ...byType,
      { key: 'Other', label: t('settings.storage.other'), color: OTHER_COLOR, gb: other },
    ].filter((s) => s.gb >= 0.01);
  }, [content, contentFolder, usedGb, typeLabels, t]);

  const isOverLimit = storageLimitGb > 0 && usedGb > storageLimitGb;
  const usedPercent = storageLimitGb > 0 ? (usedGb / storageLimitGb) * 100 : 0;
  const freeInLimitGb = Math.max(0, storageLimitGb - usedGb);

  // Over the limit the bar is full, so segments are scaled against usage instead.
  const scaleGb = isOverLimit ? usedGb : storageLimitGb;

  const hasDriveSpace = driveUsedGb !== null && driveFreeGb !== null;
  const driveTotalGb = hasDriveSpace ? driveUsedGb + driveFreeGb : null;

  return (
    <div className="rounded-lg border border-base-400 bg-base-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-medium text-base-content">{t('settings.storage.storageUsage')}</span>
        <span className="flex items-center gap-2 text-sm tabular-nums text-base-content/60">
          <span>
            {t('settings.storage.ofLimit', {
              used: formatGb(usedGb),
              limit: formatGb(storageLimitGb),
            })}
          </span>
          <span aria-hidden="true">·</span>
          <span className={`font-semibold ${isOverLimit ? 'text-error' : 'text-base-content/80'}`}>
            {isOverLimit && <AlertTriangle size={13} className="mr-1 inline-block align-[-2px]" />}
            {Math.round(usedPercent)}%{isOverLimit ? t('settings.storage.overLimit') : ''}
          </span>
        </span>
      </div>

      <div
        className="mt-3 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-base-400/35"
        role="img"
        aria-label={`${formatGb(usedGb)} GB used of a ${formatGb(storageLimitGb)} GB limit`}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            className="h-full"
            style={{
              width: `${scaleGb > 0 ? (s.gb / scaleGb) * 100 : 0}%`,
              backgroundColor: s.color,
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {segments.map((s) => (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-base-content/80">{s.label}</span>
              <span className="tabular-nums text-base-content/50">{formatGb(s.gb)} GB</span>
            </span>
          ))}
        </div>
        {!isOverLimit && (
          <span className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-[2px] border border-base-400 bg-base-400/35" />
            <span className="text-base-content/80">{t('settings.storage.freeInLimit')}</span>
            <span className="tabular-nums text-base-content/50">{formatGb(freeInLimitGb)} GB</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-base-400/50 pt-3 text-xs tabular-nums text-base-content/50">
        <span>
          {hasDriveSpace && driveTotalGb !== null
            ? t('settings.storage.driveUsedOfTotal', {
                drive: driveLabel(contentFolder, 'Disk'),
                used: formatGb(driveUsedGb),
                total: formatGb(driveTotalGb),
              })
            : t('settings.storage.checkingDriveSpace')}
        </span>
        {hasDriveSpace && (
          <span>{t('settings.storage.driveFree', { free: formatGb(driveFreeGb) })}</span>
        )}
      </div>
    </div>
  );
}
