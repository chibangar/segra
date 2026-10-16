import { Clapperboard } from 'lucide-react';
import { useClipping } from '../Context/ClippingContext';
import ContentPage from '../Components/ContentPage';
import ContentCard from '../Components/ContentCard';
import { useI18n } from '../Context/I18nContext';

export default function Clips() {
  const { t } = useI18n();
  const { clippingProgress } = useClipping();
  // Merged sessions report through the same progress, but they show up under Sessions
  const clipProgress = Object.fromEntries(
    Object.entries(clippingProgress).filter(([, p]) => p.outputType !== 'Session'),
  );

  // Pre-render the progress card element
  const progressCardElement =
    Object.keys(clipProgress).length > 0 ? (
      <ContentCard key="clipping-progress" type="Clip" isLoading />
    ) : null;

  return (
    <ContentPage
      contentType="Clip"
      sectionId="clips"
      title={t('menu.clips')}
      Icon={Clapperboard}
      progressItems={clipProgress}
      isProgressVisible={Object.keys(clipProgress).length > 0}
      progressCardElement={progressCardElement}
    />
  );
}
