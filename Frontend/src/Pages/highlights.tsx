import { Crown } from 'lucide-react';
import { useAiHighlights } from '../Context/AiHighlightsContext';
import ContentPage from '../Components/ContentPage';
import AiContentCard from '../Components/AiContentCard';
import { useI18n } from '../Context/I18nContext';

export default function Highlights() {
  const { t } = useI18n();
  const { aiProgress } = useAiHighlights();

  // Pre-render the progress card element
  const progressCardElement =
    Object.keys(aiProgress).length > 0 ? (
      <AiContentCard key="ai-highlight-progress" progress={Object.values(aiProgress)[0]} />
    ) : null;

  return (
    <ContentPage
      contentType="Highlight"
      sectionId="highlights"
      title={t('menu.highlights')}
      Icon={Crown}
      progressItems={aiProgress}
      isProgressVisible={Object.keys(aiProgress).length > 0}
      progressCardElement={progressCardElement}
    />
  );
}
