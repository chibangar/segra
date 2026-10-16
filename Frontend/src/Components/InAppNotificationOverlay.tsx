import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../Context/SettingsContext';

interface NotificationData {
  id: number;
  title: string;
  subtitle: string;
  type: string;
}

export default function InAppNotificationOverlay() {
  const settings = useSettings();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleMessage = (event: CustomEvent<any>) => {
      const detail = event.detail;
      if (detail?.method === 'InGameNotification' && detail.content) {
        const { title, subtitle, type } = detail.content;
        setNotification({
          id: Date.now(),
          title: title || 'NOTIFICATION',
          subtitle: subtitle || '',
          type: type || 'Clipping',
        });

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setNotification(null);
        }, 3500);
      }
    };

    window.addEventListener('websocket-message', handleMessage as EventListener);
    return () => {
      window.removeEventListener('websocket-message', handleMessage as EventListener);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!settings.showInGameNotifications) return null;

  // Position styles
  const position = settings.inGameNotificationPosition || 'TopRight';
  const positionClasses = {
    TopRight: 'top-5 right-5 items-end',
    TopLeft: 'top-5 left-5 items-start',
    BottomRight: 'bottom-5 right-5 items-end',
    BottomLeft: 'bottom-5 left-5 items-start',
  }[position] || 'top-5 right-5 items-end';

  // Size styles
  const size = settings.inGameNotificationSize || 'Medium';
  const sizeClasses = {
    Small: 'scale-[0.82] origin-top-right',
    Medium: 'scale-100',
    Large: 'scale-[1.2] origin-top-right',
  }[size] || 'scale-100';

  // Accent color mapping
  const getAccentColor = (type: string) => {
    switch (type) {
      case 'Clipping':
        return '#38bdf8'; // Sky-400
      case 'ClipSaved':
        return '#22c55e'; // Green-500
      case 'Kill':
        return '#ef4444'; // Red-500
      case 'Headshot':
        return '#f97316'; // Orange-500
      case 'Goal':
        return '#eab308'; // Yellow-500
      case 'Assist':
        return '#a855f7'; // Purple-500
      case 'Bookmark':
      default:
        return '#f59e0b'; // Amber-500
    }
  };

  return (
    <div className={`fixed z-[9999] pointer-events-none flex flex-col ${positionClasses}`}>
      <AnimatePresence mode="wait">
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: position.startsWith('Top') ? -20 : 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position.startsWith('Top') ? -15 : 15, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto relative w-[340px] rounded-xl overflow-hidden shadow-2xl backdrop-blur-xl border-2 transition-transform ${sizeClasses}`}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.96)',
              borderColor: getAccentColor(notification.type),
              boxShadow: `0 0 25px ${getAccentColor(notification.type)}30`,
            }}
          >
            <div className="flex items-center gap-3.5 p-3.5 pl-4">
              {/* App 3D Logo */}
              <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-slate-800/80 p-0.5">
                <img
                  src="/icon.png"
                  alt="Segra"
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 animate-ping"
                    style={{ backgroundColor: getAccentColor(notification.type) }}
                  />
                  <h4 className="text-[13px] font-black tracking-wide text-white uppercase truncate">
                    {notification.title}
                  </h4>
                </div>
                {notification.subtitle && (
                  <p className="text-[12px] text-slate-300 font-medium truncate mt-0.5">
                    {notification.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Progress duration bar */}
            <div className="h-[3px] w-full bg-slate-800/80">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 3.5, ease: 'linear' }}
                className="h-full"
                style={{ backgroundColor: getAccentColor(notification.type) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
