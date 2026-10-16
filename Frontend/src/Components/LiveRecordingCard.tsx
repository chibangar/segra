import { useState, useEffect, useRef } from 'react';
import { Square, Target, Bookmark as BookmarkIcon, Gamepad2, Monitor, AppWindow } from 'lucide-react';
import { Recording } from '../Models/types';
import { useAppState } from '../Context/AppStateContext';
import { useSettings } from '../Context/SettingsContext';
import { sendMessageToBackend } from '../Utils/MessageUtils';
import { useI18n } from '../Context/I18nContext';

const pad = (n: number) => String(n).padStart(2, '0');

interface LiveRecordingCardProps {
  recording: Recording;
}

export default function LiveRecordingCard({ recording }: LiveRecordingCardProps) {
  const { language } = useI18n();
  const state = useAppState();
  const settings = useSettings();
  const timerRef = useRef<HTMLSpanElement>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const gameName = recording.game || 'Game Recording';
  const showGameBackground = settings.showGameBackground && !settings.airplaneMode;

  // Real-time ticking timer
  useEffect(() => {
    if (!recording.startTime) return;
    const startTime = new Date(recording.startTime).getTime();

    const updateTimer = () => {
      if (!timerRef.current) return;
      const secondsElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const hours = Math.floor(secondsElapsed / 3600);
      const minutes = Math.floor((secondsElapsed % 3600) / 60);
      const seconds = secondsElapsed % 60;
      timerRef.current.textContent =
        hours > 0
          ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
          : `${pad(minutes)}:${pad(seconds)}`;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [recording.startTime]);

  // Fetch cover image
  useEffect(() => {
    if (!showGameBackground || !gameName || gameName === 'Manual Recording') {
      setCoverUrl(null);
      return;
    }

    if (recording.coverImageId) {
      setCoverUrl(`https://segra.tv/api/games/cover/${recording.coverImageId}`);
      return;
    }

    const listed = state.gameList.find((g) => g.name === gameName);
    if (listed?.icon) {
      setCoverUrl(`https://segra.tv/api/games/icon/${listed.icon}`);
    }
  }, [gameName, recording.coverImageId, showGameBackground, state.gameList]);

  // Capture mode icon
  const captureMode = recording.isUsingGameHook
    ? 'game'
    : recording.isUsingWindowCapture
      ? 'window'
      : 'display';
  const CaptureIcon =
    captureMode === 'game' ? Gamepad2 : captureMode === 'window' ? AppWindow : Monitor;

  // Real-time stats from bookmarks
  const kills = recording.bookmarks?.filter((b) => b.type === 'Kill').length || 0;
  const bookmarksCount =
    recording.bookmarks?.filter((b) => b.type === 'Manual').length || 0;

  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden border-2 border-red-500/60 shadow-lg shadow-red-500/10 bg-base-300 group transition-all duration-300">
      {/* Background Cover / Art */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={gameName}
            className="w-full h-full object-cover opacity-60 scale-105 group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-base-300">
            <CaptureIcon className="w-12 h-12 text-slate-700" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-base-300 via-transparent to-black/60" />

        {/* Live Indicator Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600/90 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md shadow-md animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white" />
          <span>{language === 'pt-PT' ? 'A Gravar' : 'Live'}</span>
        </div>

        {/* Live Elapsed Time */}
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-black/75 text-white font-mono font-semibold text-xs backdrop-blur-md border border-white/10">
          <span ref={timerRef}>00:00</span>
        </div>

        {/* Center Live Wave Effect */}
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          {kills > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/80 text-white text-xs font-semibold backdrop-blur-md shadow">
              <Target size={13} />
              <span>{kills} {kills === 1 ? 'Kill' : 'Kills'}</span>
            </div>
          )}
          {bookmarksCount > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/80 text-white text-xs font-semibold backdrop-blur-md shadow">
              <BookmarkIcon size={13} />
              <span>{bookmarksCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Info & Controls */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1 justify-between bg-base-300">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-base-content/60 font-medium">
            <CaptureIcon size={13} />
            <span className="capitalize">{captureMode} Capture</span>
          </div>
          <h3 className="text-base font-bold text-base-content truncate mt-0.5" title={gameName}>
            {gameName}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => sendMessageToBackend('StopRecording')}
          className="btn btn-sm btn-error btn-outline w-full gap-2 mt-1 font-semibold"
        >
          <Square size={13} className="fill-current" />
          {language === 'pt-PT' ? 'Parar Gravação' : 'Stop Recording'}
        </button>
      </div>
    </div>
  );
}
