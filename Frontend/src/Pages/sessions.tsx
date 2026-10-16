import { Play } from 'lucide-react';
import ContentPage from '../Components/ContentPage';
import { useAppState } from '../Context/AppStateContext';
import { useClipping } from '../Context/ClippingContext';
import ContentCard from '../Components/ContentCard';
import { useI18n } from '../Context/I18nContext';
import LiveRecordingCard from '../Components/LiveRecordingCard';

export default function Sessions() {
  const { t } = useI18n();
  const { isFinishingRecording, recording } = useAppState();
  const { clippingProgress } = useClipping();
  const isMergingSessions = Object.values(clippingProgress).some(
    (p) => p.outputType === 'Session' && p.progress >= 0,
  );
  const showProgress = isFinishingRecording || isMergingSessions;

  // Pre-render the progress card element
  const progressCardElement = showProgress ? (
    <ContentCard key="recording-progress" type="Session" isLoading />
  ) : null;

  const liveCardElement = recording ? (
    <LiveRecordingCard key="live-recording" recording={recording} />
  ) : null;

  return (
    <ContentPage
      contentType="Session"
      sectionId="sessions"
      title={t('menu.fullSessions')}
      Icon={Play}
      progressItems={showProgress ? { recording: true } : {}}
      isProgressVisible={showProgress}
      progressCardElement={progressCardElement}
      liveCardElement={liveCardElement}
      isLiveVisible={!!recording}
    />
  );
}
