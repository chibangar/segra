import { useState, useEffect, useMemo, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderInput } from 'lucide-react';
import { Settings as SettingsType } from '../../Models/types';
import { sendMessageToBackend } from '../../Utils/MessageUtils';
import { clampInt } from '../../Utils/NumberUtils';
import { useModal } from '../../Context/ModalContext';
import ConfirmationModal from '../ConfirmationModal';
import Button from '../Button';
import MigrationFlow from '../MigrationFlow';
import { useAppState } from '../../Context/AppStateContext';
import { useContentMigration } from '../../Context/ContentMigrationContext';
import { useI18n } from '../../Context/I18nContext';
import StorageUsageMeter from './StorageUsageMeter';

const normalizePath = (path: string) => path.replace(/\\/g, '/').replace(/\/+$/, '');

const TYPE_FOLDERS = ['Full Sessions', 'Replay Buffers', 'Clips', 'Highlights'];

// The recording-path root a file currently lives under (the part before its content-type folder).
const deriveSourceRoot = (filePath: string) => {
  const p = normalizePath(filePath);
  const lower = p.toLowerCase();
  for (const folder of TYPE_FOLDERS) {
    const idx = lower.lastIndexOf('/' + folder.toLowerCase() + '/');
    if (idx >= 0) return p.slice(0, idx);
  }
  const lastSlash = p.lastIndexOf('/');
  return lastSlash > 0 ? p.slice(0, lastSlash) : p;
};

interface StorageSettingsSectionProps {
  settings: SettingsType;
  updateSettings: (updates: Partial<SettingsType>) => void;
}

export default function StorageSettingsSection({
  settings,
  updateSettings,
}: StorageSettingsSectionProps) {
  const { t } = useI18n();
  const appState = useAppState();
  const { isMigrating } = useContentMigration();
  const [localStorageLimit, setLocalStorageLimit] = useState<string>(String(settings.storageLimit));
  const { openModal, closeModal } = useModal();
  const driveUsedGb = appState.recordingDriveUsedGb;
  const driveFreeGb = appState.recordingDriveFreeGb;

  useEffect(() => {
    setLocalStorageLimit(String(settings.storageLimit));
  }, [settings.storageLimit]);

  const [localContentFolder, setLocalContentFolder] = useState(settings.contentFolder);
  const [localCacheFolder, setLocalCacheFolder] = useState(settings.cacheFolder);

  useEffect(() => {
    setLocalContentFolder(settings.contentFolder);
  }, [settings.contentFolder]);

  useEffect(() => {
    setLocalCacheFolder(settings.cacheFolder);
  }, [settings.cacheFolder]);

  const blurOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  useEffect(() => {
    sendMessageToBackend('RefreshStorageStats');
  }, []);

  // Content whose video file is stored outside the current recording path (left behind after
  // the recording path was changed). The migration button below offers to consolidate it.
  const outsideContent = useMemo(() => {
    const root = normalizePath((settings.contentFolder || '').trim());
    if (!root) return [];
    const rootPrefix = root.toLowerCase() + '/';
    return appState.content.filter((c) => {
      const filePath = normalizePath(c.filePath || '');
      if (!filePath) return false;
      return !filePath.toLowerCase().startsWith(rootPrefix);
    });
  }, [appState.content, settings.contentFolder]);

  const outsideCount = outsideContent.length;
  const outsideSizeGb = useMemo(
    () => outsideContent.reduce((sum, c) => sum + (c.fileSizeKb || 0), 0) / (1024 * 1024),
    [outsideContent],
  );
  const fromPaths = useMemo(
    () =>
      Array.from(new Set(outsideContent.map((c) => deriveSourceRoot(c.filePath || '')))).filter(
        Boolean,
      ),
    [outsideContent],
  );

  const handleBrowseClick = () => {
    sendMessageToBackend('SetVideoLocation');
  };

  const handleMigrateClick = () => {
    openModal(
      <ConfirmationModal
        title={t('settings.storage.moveVideosModalTitle')}
        description={
          <MigrationFlow
            fromPaths={fromPaths}
            toPath={settings.contentFolder}
            count={outsideCount}
            sizeGb={outsideSizeGb}
          />
        }
        confirmText={t('settings.storage.moveVideosConfirmText')}
        cancelText={t('common.cancel')}
        onConfirm={() => {
          sendMessageToBackend('MigrateContent');
          closeModal();
        }}
        onCancel={closeModal}
      />,
      { size: 'xl' },
    );
  };

  const handleCacheBrowseClick = () => {
    sendMessageToBackend('SetCacheLocation');
  };

  const handleStorageLimitBlur = () => {
    const currentFolderSizeGb = appState.currentFolderSizeGb;
    const numericLimit = clampInt(localStorageLimit, 1, Number.MAX_SAFE_INTEGER, 1);
    setLocalStorageLimit(String(numericLimit));

    // Check if the new limit is below the current folder size
    if (numericLimit < currentFolderSizeGb) {
      openModal(
        <ConfirmationModal
          title={t('settings.storage.storageLimitWarningTitle')}
          description={t('settings.storage.storageLimitWarningDesc', {
            limit: numericLimit,
            current: currentFolderSizeGb.toFixed(2),
          })}
          confirmText={t('settings.storage.applyLimit')}
          cancelText={t('common.cancel')}
          onConfirm={() => {
            updateSettings({ storageLimit: numericLimit });
            closeModal();
          }}
          onCancel={() => {
            // Reset to the previous value
            setLocalStorageLimit(String(settings.storageLimit));
            closeModal();
          }}
        />,
      );
    } else {
      updateSettings({ storageLimit: numericLimit });
    }
  };

  return (
    <div className="p-4 bg-base-300 rounded-lg shadow-md border border-base-400">
      <h2 className="text-xl font-semibold mb-4">{t('settings.storage.title')}</h2>
      <div className="grid grid-cols-2 gap-4">
        {/* Recording Path */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-base-content">
              {t('settings.storage.recordingPath')}
            </span>
          </label>
          <div className="flex space-x-2">
            <div className="join w-full">
              <input
                type="text"
                name="contentFolder"
                value={localContentFolder}
                onChange={(e) => setLocalContentFolder(e.target.value)}
                onBlur={() => {
                  if (localContentFolder !== settings.contentFolder) {
                    updateSettings({ contentFolder: localContentFolder });
                  }
                }}
                onKeyDown={blurOnEnter}
                placeholder={t('settings.storage.folderPlaceholder')}
                className="input input-bordered flex-1 bg-base-200 join-item"
              />
              <button
                onClick={handleBrowseClick}
                className="btn btn-secondary bg-base-200 hover:bg-base-300 border-base-400 hover:border-base-400 font-semibold join-item"
              >
                {t('settings.storage.browse')}
              </button>
            </div>
          </div>
        </div>

        {/* Cache Folder Path */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-base-content">{t('settings.storage.cachePath')}</span>
          </label>
          <div className="flex space-x-2">
            <div className="join w-full">
              <input
                type="text"
                name="cacheFolder"
                value={localCacheFolder}
                onChange={(e) => setLocalCacheFolder(e.target.value)}
                onBlur={() => {
                  if (localCacheFolder !== settings.cacheFolder) {
                    updateSettings({ cacheFolder: localCacheFolder });
                  }
                }}
                onKeyDown={blurOnEnter}
                placeholder={t('settings.storage.cachePlaceholder')}
                className="input input-bordered flex-1 bg-base-200 join-item"
              />
              <button
                onClick={handleCacheBrowseClick}
                className="btn btn-secondary bg-base-200 hover:bg-base-300 border-base-400 hover:border-base-400 font-semibold join-item"
              >
                {t('settings.storage.browse')}
              </button>
            </div>
          </div>
        </div>

        {/* Storage Limit */}
        <div className="form-control">
          <label className="label block px-0">
            <span className="label-text text-base-content">
              {t('settings.storage.storageLimit')}
            </span>
          </label>

          <div className="relative w-full">
            <input
              type="number"
              name="storageLimit"
              value={localStorageLimit}
              onChange={(e) => setLocalStorageLimit(e.target.value)}
              onBlur={handleStorageLimitBlur}
              placeholder={t('settings.storage.limitPlaceholder')}
              min="1"
              className="input input-bordered bg-base-200 w-full block pr-12 outline-none focus:border-base-400"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-sm opacity-60 pointer-events-none">
              GB
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <StorageUsageMeter
          content={appState.content}
          contentFolder={settings.contentFolder}
          storageLimitGb={settings.storageLimit}
          usedGb={appState.currentFolderSizeGb}
          driveUsedGb={driveUsedGb}
          driveFreeGb={driveFreeGb}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg border border-base-400">
          <input
            type="checkbox"
            name="removeOriginalAfterCompression"
            checked={settings.removeOriginalAfterCompression}
            onChange={(e) => updateSettings({ removeOriginalAfterCompression: e.target.checked })}
            className="checkbox checkbox-primary checkbox-sm"
          />
          <div>
            <div className="font-semibold">
              {t('settings.storage.deleteOriginalAfterCompression')}
            </div>
            <div className="text-sm opacity-70 mt-0.5">
              {t('settings.storage.deleteOriginalAfterCompressionDesc')}
            </div>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-base-200 rounded-lg border border-base-400">
          <input
            type="checkbox"
            name="discardSessionsWithoutBookmarks"
            checked={settings.discardSessionsWithoutBookmarks}
            onChange={(e) => updateSettings({ discardSessionsWithoutBookmarks: e.target.checked })}
            className="checkbox checkbox-primary checkbox-sm"
          />
          <div>
            <div className="font-semibold">
              {t('settings.storage.discardSessionsWithoutBookmarks')}
            </div>
            <div className="text-sm opacity-70 mt-0.5">
              {t('settings.storage.discardSessionsWithoutBookmarksDesc')}
            </div>
          </div>
        </label>
      </div>

      {/* Migrate content stored outside the recording path */}
      <AnimatePresence initial={false}>
        {outsideCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: 'fit-content',
              transition: {
                duration: 0.3,
                height: { type: 'spring', stiffness: 300, damping: 30 },
              },
            }}
            exit={{
              opacity: 0,
              height: 0,
              transition: {
                duration: 0.2,
              },
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-base-400 bg-base-200 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-base-content font-medium">
                  {t('settings.storage.outsideVideos', {
                    count: outsideCount,
                    size: outsideSizeGb.toFixed(2),
                  })}
                </p>
                <p className="text-sm opacity-70">{t('settings.storage.outsideVideosDesc')}</p>
              </div>
              <Button
                variant="primary"
                className="gap-2 shrink-0"
                onClick={handleMigrateClick}
                loading={isMigrating}
              >
                {!isMigrating && <FolderInput size={16} className="shrink-0" />}
                <span className="inline-block">
                  {isMigrating
                    ? t('settings.storage.movingToRecordingPath')
                    : t('settings.storage.moveToRecordingPath')}
                </span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
