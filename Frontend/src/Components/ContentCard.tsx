import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useSettings } from '../Context/SettingsContext';
import { useAppState, usePatchContent } from '../Context/AppStateContext';
import { BookmarkType, BookmarkSubtype, Content, includeInHighlight } from '../Models/types';
import { sendMessageToBackend } from '../Utils/MessageUtils';
import { openFileLocation, contentTypeToFolderName } from '../Utils/FileUtils';
import { useModal } from '../Context/ModalContext';
import UploadModal from './UploadModal';
import {
  Upload,
  FolderOpen,
  PenLine,
  Trash2,
  Ellipsis,
  Minimize2,
  Crown,
  Copy,
  Bookmark,
  ExternalLink,
  Play,
} from 'lucide-react';
import { Link, Check } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { useAiHighlights } from '../Context/AiHighlightsContext';
import { useCompression } from '../Context/CompressionContext';
import Button from './Button';
import { useDeleteConfirmation } from '../Hooks/useDeleteConfirmation';
import { useI18n } from '../Context/I18nContext';

type VideoType = 'Session' | 'Buffer' | 'Clip' | 'Highlight';

// Content keys (type:fileName) present at the first populated list. Anything absent afterwards
// appeared while the app was open and is the only kind whose thumbnail animates in.
const knownContentKeys = new Set<string>();
let hasSeededKnownContent = false;

// Thumbnails already loaded this session, so a remounted card shows instantly without re-animating.
const loadedThumbnailKeys = new Set<string>();

// Shared observer that collapses far off-screen cards to fixed-size placeholders.
const offscreenCallbacks = new Map<Element, (entry: IntersectionObserverEntry) => void>();
const offscreenObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) offscreenCallbacks.get(entry.target)?.(entry);
  },
  { rootMargin: '600px 0px' },
);

interface VideoCardProps {
  content?: Content; // Optional for skeleton cards
  type: VideoType;
  onClick?: (video: Content, event: React.MouseEvent) => void; // Click handler for the entire card
  isLoading?: boolean; // Indicates if this is a loading (skeleton) card
  isSelected?: boolean; // Whether this card is selected in multi-select mode
  isSelectionMode?: boolean; // Whether multi-select mode is active
  isHighlighted?: boolean; // Briefly pulse the card to draw attention (e.g. after import)
}

export default function ContentCard({
  content,
  type,
  onClick,
  isLoading,
  isSelected = false,
  isSelectionMode = false,
  isHighlighted = false,
}: VideoCardProps) {
  const { enableAi, showNewBadgeOnVideos, airplaneMode } = useSettings();
  const { cacheFolder, content: allContent } = useAppState();
  const patchContent = usePatchContent();
  const { openModal, closeModal } = useModal();
  const { aiProgress } = useAiHighlights();
  const { compressionProgress, isCompressing } = useCompression();
  const confirmDelete = useDeleteConfirmation();
  const { t, language } = useI18n();

  const isBeingCompressed = content?.filePath ? isCompressing(content.filePath) : false;
  const currentCompressionProgress = content?.filePath
    ? compressionProgress[content.filePath]
    : undefined;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTriggerRef = useRef<HTMLLabelElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const uploadModalSequenceRef = useRef(0);

  const cardRef = useRef<HTMLDivElement>(null);
  // Card height while collapsed to a placeholder, or null when fully rendered.
  const [placeholderHeight, setPlaceholderHeight] = useState<number | null>(null);
  // An open menu opts the card out, so the dropdown/context menu never unmounts mid-use.
  const showPlaceholder =
    placeholderHeight !== null && !isDropdownOpen && contextMenuPosition === null;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    offscreenCallbacks.set(el, (entry) => {
      if (entry.isIntersecting) {
        setPlaceholderHeight(null);
      } else {
        const { height } = entry.boundingClientRect;
        setPlaceholderHeight((prev) => (height > 0 ? height : prev));
      }
    });
    offscreenObserver.observe(el);
    return () => {
      offscreenObserver.unobserve(el);
      offscreenCallbacks.delete(el);
    };
  }, [isLoading, showPlaceholder]);

  const thumbnailRef = useRef<HTMLImageElement>(null);
  const thumbnailKey = `${type}:${content?.id ?? ''}`;
  const isNewContent =
    hasSeededKnownContent && content != null && !knownContentKeys.has(thumbnailKey);

  // Existing content starts "loaded" (instant); only newly appeared content crossfades from the shimmer.
  const [thumbnailLoaded, setThumbnailLoaded] = useState(
    () => !isNewContent || loadedThumbnailKeys.has(thumbnailKey),
  );

  // Seed the known set on the first populated list; record each card on mount so it stays "known".
  useEffect(() => {
    if (!hasSeededKnownContent && allContent.length > 0) {
      for (const item of allContent) knownContentKeys.add(`${item.type}:${item.id}`);
      hasSeededKnownContent = true;
    }
    if (content?.id) knownContentKeys.add(thumbnailKey);
  }, [allContent, thumbnailKey, content?.id]);

  const markThumbnailLoaded = useCallback(() => {
    loadedThumbnailKeys.add(thumbnailKey);
    setThumbnailLoaded(true);
  }, [thumbnailKey]);

  // A cached thumbnail can already be `complete` on mount. Mark it loaded before paint so it shows
  // instantly (no crossfade) rather than briefly shimmering.
  useLayoutEffect(() => {
    const img = thumbnailRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      markThumbnailLoaded();
    }
  }, [markThumbnailLoaded]);

  const updateDropdownPosition = useCallback(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 245px below, open upward
      if (spaceBelow < 245) {
        dropdownRef.current.classList.add('dropdown-top');
      } else {
        dropdownRef.current.classList.remove('dropdown-top');
      }
    }
  }, []);

  // Update position on scroll/resize while dropdown is open
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handler = () => updateDropdownPosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true); // Capture phase for parent scrolling
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isDropdownOpen, updateDropdownPosition]);

  if (isLoading) {
    // Render a skeleton card
    return (
      <div
        className={
          type === 'Highlight'
            ? 'w-full rounded-2xl relative highlight-card overflow-hidden'
            : 'flex flex-col w-full rounded-2xl overflow-hidden bg-[#121620] border border-white/[0.07]'
        }
      >
        {type === 'Highlight' && (
          <div className="absolute inset-0 rounded-2xl highlight-border">
            <div className="absolute inset-px bg-[#121620] rounded-2xl overflow-hidden z-2">
              <figure className="relative aspect-video">
                <div
                  className="skeleton w-full h-full bg-white/5"
                ></div>
              </figure>
              <div className="p-3 text-gray-300">
                {/* Title Skeleton */}
                <div className="skeleton bg-white/10 h-4 w-3/4 mb-2 mt-1 rounded"></div>
                {/* Metadata Skeleton */}
                <div className="skeleton bg-white/5 h-3.5 w-4/6 rounded"></div>
              </div>
            </div>
          </div>
        )}

        {type !== 'Highlight' && (
          <>
            <figure className="relative aspect-video bg-black/60">
              <div className="skeleton w-full h-full bg-white/5"></div>
            </figure>
            <div className="p-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <div className="skeleton bg-white/10 h-4 w-3/4 rounded"></div>
              </div>
              <div className="skeleton bg-white/5 h-3 w-1/2 rounded"></div>
            </div>
          </>
        )}
      </div>
    );
  }

  const getThumbnailPath = (): string => {
    const thumbnailPath = `${cacheFolder}/thumbnails/${contentTypeToFolderName(type)}/${content?.id}.jpeg`;
    return `http://localhost:2222/api/thumbnail?input=${encodeURIComponent(thumbnailPath)}`;
  };

  const formatDuration = (duration: string): string => {
    try {
      const time = duration.split('.')[0]; // Remove fractional seconds
      const [hours, minutes, seconds] = time.split(':').map(Number);

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    } catch {
      return '00:00'; // Fallback for invalid duration
    }
  };

  const thumbnailPath = getThumbnailPath();
  const formattedDuration = formatDuration(content!.duration);
  const manualBookmarkCount =
    content?.bookmarks?.filter((b) => b.type === BookmarkType.Manual).length ?? 0;

  const isAceClip = useMemo(() => {
    if (!content) return false;
    const hasAceBookmark = content.bookmarks?.some(
      (b) => b.subtype === BookmarkSubtype.Ace || (b.subtype as string) === 'Ace',
    );
    const hasAceInTitle = content.title?.toLowerCase().includes('ace') ?? false;
    return hasAceBookmark || hasAceInTitle;
  }, [content]);

  // Check if content was created within the last hour and hasn't been viewed yet
  const isRecent = useMemo((): boolean => {
    if (!content) return false;

    // Check if this content has been viewed already
    const viewedContent = localStorage.getItem('viewed-content') || '{}';
    const viewedContentObj = JSON.parse(viewedContent);
    if (viewedContentObj[content.id]) {
      return false;
    }

    const createdAt = new Date(content.createdAt);
    const now = new Date();
    const diffInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 1;
  }, [content?.id, content?.createdAt]);

  const markAsViewed = () => {
    if (!content) return;

    const viewedContent = localStorage.getItem('viewed-content') || '{}';
    const viewedContentObj = JSON.parse(viewedContent);
    viewedContentObj[content.id] = true;
    localStorage.setItem('viewed-content', JSON.stringify(viewedContentObj));
  };

  const handleUpload = () => {
    uploadModalSequenceRef.current += 1;
    openModal(
      <UploadModal
        key={`${content!.fileName}-${uploadModalSequenceRef.current}`}
        video={content!}
        onClose={closeModal}
        onUpload={(title, description, visibility) => {
          const parameters = {
            Id: content!.id,
            Title: title,
            Description: description,
            Visibility: visibility,
          };

          sendMessageToBackend('UploadContent', parameters);
        }}
      />,
    );
  };

  const handleCreateAiClip = () => {
    const parameters: any = {
      Id: content!.id,
    };

    sendMessageToBackend('CreateAiClip', parameters);
  };

  const handleDelete = () => {
    const parameters = {
      Id: content!.id,
    };

    const displayName = content!.title || content!.game || content!.fileName;
    confirmDelete({
      title: t('content.deleteSingleTitle'),
      description: (
        <>
          {language === 'pt-PT' ? (
            <>
              Tem a certeza de que deseja eliminar permanentemente <strong>{displayName}</strong>?
              <br />
              <span className="text-sm text-gray-400">Esta ação não pode ser revertida.</span>
            </>
          ) : (
            <>
              Are you sure you want to permanently delete <strong>{displayName}</strong>?
              <br />
              <span className="text-sm text-gray-400">This action cannot be undone.</span>
            </>
          )}
        </>
      ),
      confirmText: t('common.delete'),
      onConfirm: () => sendMessageToBackend('DeleteContent', parameters),
    });
  };

  const startRenaming = () => {
    setRenameValue(content!.title || '');
    setIsRenaming(true);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  };

  const commitRename = () => {
    if (!isRenaming) return;
    setIsRenaming(false);
    const trimmed = renameValue.trim();
    sendMessageToBackend('RenameContent', {
      Id: content!.id,
      Title: trimmed,
    });
    // Show the new title immediately; the backend's State push confirms it.
    patchContent(content!.id, { title: trimmed });
  };

  const handleOpenFileLocation = () => openFileLocation(content!.filePath);

  useEffect(() => {
    if (!contextMenuPosition) return;

    const closeContextMenu = () => setContextMenuPosition(null);
    // Capture phase so this Escape doesn't also clear the page's card selection.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeContextMenu();
      }
    };
    window.addEventListener('click', closeContextMenu);
    window.addEventListener('blur', closeContextMenu);
    window.addEventListener('resize', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('blur', closeContextMenu);
      window.removeEventListener('resize', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [contextMenuPosition]);

  useEffect(() => {
    const closeContextMenu = () => setContextMenuPosition(null);
    window.addEventListener('segra:close-content-context-menus', closeContextMenu);

    return () => {
      window.removeEventListener('segra:close-content-context-menus', closeContextMenu);
    };
  }, []);

  const openContextMenu = (event: React.MouseEvent) => {
    if (isBeingCompressed) return;

    event.preventDefault();
    event.stopPropagation();
    (document.activeElement as HTMLElement | null)?.blur();
    window.dispatchEvent(new Event('segra:close-content-context-menus'));

    const menuWidth = 208;
    const actionCount =
      3 +
      (!airplaneMode && (type === 'Clip' || type === 'Highlight') ? 1 : 0) +
      (type === 'Clip' || type === 'Highlight' || type === 'Buffer' ? 1 : 0) +
      (type === 'Session' && enableAi ? 1 : 0) +
      ((type === 'Clip' || type === 'Highlight') && !content?.compressed ? 1 : 0);
    const menuHeight = actionCount * 40 + 16;
    setContextMenuPosition({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    });
  };

  const uploadUrl = content?.uploadUrl;

  const hasHighlightBookmarks = content?.bookmarks?.some((bookmark) =>
    includeInHighlight(bookmark.type),
  );
  const isCreatingHighlight = Object.values(aiProgress).some(
    (progress) => progress.content.id === content?.id && progress.status === 'processing',
  );

  const renderMenuItems = (closeMenu: () => void) => (
    <>
      {!airplaneMode && (type === 'Clip' || type === 'Highlight') && (
        <li>
          <Button
            variant="menuPrimary"
            onClick={() => {
              closeMenu();
              handleUpload();
            }}
          >
            <Upload size={20} />
            <span>{t('common.upload')}</span>
          </Button>
        </li>
      )}
      {(type === 'Clip' || type === 'Highlight' || type === 'Buffer') && (
        <li>
          <Button
            variant="menu"
            onClick={() => {
              closeMenu();
              sendMessageToBackend('CopyFileToClipboard', {
                FilePath: content!.filePath,
              });
            }}
          >
            <Copy size={20} />
            <span>{t('common.copy')}</span>
          </Button>
        </li>
      )}
      {type === 'Session' && enableAi && (
        <li>
          <Button
            variant="menuPurple"
            disabled={!hasHighlightBookmarks || isCreatingHighlight}
            onClick={() => {
              if (!hasHighlightBookmarks || isCreatingHighlight) return;
              closeMenu();
              handleCreateAiClip();
            }}
          >
            <Crown size={20} />
            <span>
              {isCreatingHighlight
                ? t('content.creatingHighlight')
                : hasHighlightBookmarks
                  ? t('content.createHighlight')
                  : t('content.noHighlights')}
            </span>
          </Button>
        </li>
      )}
      <li>
        <Button
          variant="menu"
          onClick={() => {
            closeMenu();
            startRenaming();
          }}
        >
          <PenLine size={20} />
          <span>{t('common.rename')}</span>
        </Button>
      </li>
      <li>
        <Button
          variant="menu"
          onClick={() => {
            closeMenu();
            handleOpenFileLocation();
          }}
        >
          <FolderOpen size={20} />
          <span>{t('common.openFileLocation')}</span>
        </Button>
      </li>
      {(type === 'Clip' || type === 'Highlight') && !content?.compressed && (
        <li>
          <Button
            variant="menu"
            onClick={() => {
              closeMenu();
              sendMessageToBackend('CompressVideo', { Id: content!.id });
            }}
          >
            <Minimize2 size={20} />
            <span>{t('common.compress')}</span>
          </Button>
        </li>
      )}
      <li>
        <Button
          variant="menuDanger"
          onClick={() => {
            closeMenu();
            handleDelete();
          }}
        >
          <Trash2 size={20} />
          <span>{t('common.delete')}</span>
        </Button>
      </li>
    </>
  );

  if (showPlaceholder) {
    return (
      <div
        ref={cardRef}
        data-content-id={content!.id}
        className={`w-full rounded-2xl bg-[#121620] border border-white/[0.07] ${isSelected ? '!ring-2 !ring-primary' : ''}`}
        style={{ height: placeholderHeight! }}
      />
    );
  }

  return (
    <div
      ref={cardRef}
      data-content-id={content!.id}
      className={`group relative flex flex-col w-full rounded-2xl overflow-hidden bg-[#121620] border border-white/[0.07] hover:border-white/20 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-0.5 transition-all duration-200 ${
        isSelected ? '!ring-2 !ring-primary border-primary/50' : ''
      } ${isHighlighted ? 'import-pulse' : ''} ${
        isBeingCompressed ? 'cursor-default opacity-75' : 'cursor-pointer'
      } ${isSelectionMode ? 'select-none' : ''}`}
      onClick={(e) => {
        if (isBeingCompressed) return;
        if (!isSelectionMode && !e.ctrlKey) markAsViewed();
        onClick?.(content!, e);
      }}
      onContextMenu={openContextMenu}
    >
      <figure className="relative aspect-video w-full bg-black/60 overflow-hidden">
        {/* Shimmer crossfades out as the image fades in, so the figure never flashes black. */}
        <div
          className={`absolute inset-0 bg-[#0b0e14] transition-opacity duration-200 ${thumbnailLoaded ? 'opacity-0' : 'skeleton opacity-100'}`}
        />
        <img
          ref={thumbnailRef}
          src={thumbnailPath}
          alt={'thumbnail'}
          className={`w-full h-full object-cover select-none transition-all duration-300 group-hover:scale-105 ${thumbnailLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          width={1600}
          height={900}
          draggable={false}
          onLoad={markThumbnailLoaded}
          onError={markThumbnailLoaded}
        />

        {/* Hover play button overlay - Medal signature */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
          <div className="w-11 h-11 rounded-full bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play size={18} fill="#fecb00" className="ml-0.5 text-primary" />
          </div>
        </div>

        {/* Medal duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white/95 text-[11px] font-semibold px-2 py-0.5 rounded-md border border-white/10 tracking-wide">
          {formattedDuration}
        </span>

        {/* ACE Badge or Bookmark Badge */}
        {isAceClip ? (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-[10px] px-2 py-0.5 rounded shadow-lg shadow-yellow-500/30 flex items-center gap-1 uppercase tracking-wider">
            ★ ACE
          </span>
        ) : manualBookmarkCount > 0 ? (
          <span className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-yellow-400 border border-yellow-400/20 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
            <Bookmark size={12} fill="currentColor" />
            <span>{manualBookmarkCount}</span>
          </span>
        ) : null}

        {/* Selection checkbox */}
        <input
          type="checkbox"
          className={`checkbox checkbox-primary checkbox-sm absolute top-2 left-2 [&:not(:checked)]:bg-black/40 transition-opacity duration-200 ${isSelectionMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          checked={isSelected}
          readOnly
        />

        {/* NEW Badge */}
        {isRecent && (type === 'Session' || type === 'Buffer') && showNewBadgeOnVideos && (
          <span
            className={`absolute top-2 left-2 bg-primary text-black font-bold text-[10px] px-2 py-0.5 rounded tracking-wider shadow transition-opacity duration-200 ${isSelectionMode ? 'opacity-0' : 'opacity-95'}`}
          >
            NOVO
          </span>
        )}

        {/* Compression progress overlay */}
        {currentCompressionProgress && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <p className="text-white text-sm mb-2 font-medium">
              {currentCompressionProgress.status === 'compressing'
                ? 'Compressing...'
                : currentCompressionProgress.status === 'done'
                  ? 'Done!'
                  : currentCompressionProgress.status === 'skipped'
                    ? 'Skipped'
                    : 'Error'}
            </p>
            {currentCompressionProgress.status === 'compressing' && (
              <div className="w-2/3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${currentCompressionProgress.progress}%` }}
                />
              </div>
            )}
            {currentCompressionProgress.message && (
              <p className="text-white/70 text-xs mt-1">{currentCompressionProgress.message}</p>
            )}
          </div>
        )}
      </figure>

      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div className="flex justify-between items-center gap-2">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsRenaming(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold truncate bg-transparent outline-none w-full text-white"
              placeholder={content!.game || 'Untitled'}
            />
          ) : (
            <h2 className="text-sm font-semibold truncate text-white/95 group-hover:text-primary transition-colors">
              {content!.title || content!.game || 'Untitled'}
            </h2>
          )}
          <div
            ref={dropdownRef}
            className={`dropdown dropdown-end shrink-0 ${isBeingCompressed ? 'pointer-events-none opacity-50' : ''}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                (document.activeElement as HTMLElement | null)?.blur();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dropdownTriggerRef.current?.focus();
            }}
            onFocus={() => {
              window.dispatchEvent(new Event('segra:close-content-context-menus'));
              updateDropdownPosition();
              setIsDropdownOpen(true);
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsDropdownOpen(false);
              }
            }}
          >
            <label
              ref={dropdownTriggerRef}
              tabIndex={isBeingCompressed ? -1 : 0}
              className="btn btn-ghost btn-xs btn-circle text-gray-400 hover:text-white hover:bg-white/10 active:bg-white/10"
            >
              <Ellipsis size={18} />
            </label>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-[#121620] border border-white/[0.09] rounded-xl shadow-2xl z-999 w-52 p-1.5"
            >
              {renderMenuItems(() => (document.activeElement as HTMLElement).blur())}
            </ul>
          </div>
        </div>

        <div className="text-xs text-gray-400 flex items-center justify-between w-full min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            {content!.game && (
              <span className="bg-white/[0.06] text-gray-300 font-medium px-1.5 py-0.5 rounded text-[11px] truncate max-w-[130px]">
                {content!.game}
              </span>
            )}
            <span className="text-gray-600">&bull;</span>
            <span className="truncate">{new Date(content!.createdAt).toLocaleDateString()}</span>
            <span className="text-gray-600">&bull;</span>
            <span className="shrink-0">{content!.fileSize}</span>
          </div>
          {!airplaneMode && uploadUrl && (
            <div className="flex items-center gap-0.5 shrink-0 pl-1">
              <span
                className="btn btn-ghost btn-xs btn-circle hover:bg-white/10 active:bg-white/10 text-gray-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(uploadUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <MorphIcon icon={copied ? Check : Link} size={15} spring="snappy" />
              </span>
              <span
                className="btn btn-ghost btn-xs btn-circle hover:bg-white/10 active:bg-white/10 text-gray-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  sendMessageToBackend('OpenInBrowser', {
                    Url: uploadUrl,
                  });
                }}
              >
                <ExternalLink size={15} />
              </span>
            </div>
          )}
        </div>
      </div>

      {contextMenuPosition && (
        <ul
          className="menu fixed z-1000 w-52 rounded-xl border border-white/[0.09] bg-[#121620] p-1.5 shadow-2xl"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {renderMenuItems(() => setContextMenuPosition(null))}
        </ul>
      )}
    </div>
  );
}
