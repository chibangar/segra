import { History } from 'lucide-react';
import ContentPage from '../Components/ContentPage';
import { useI18n } from '../Context/I18nContext';

export default function ReplayBuffer() {
  const { t } = useI18n();
  return (
    <ContentPage
      contentType="Buffer"
      sectionId="replayBuffer"
      title={t('menu.replayBuffer')}
      Icon={History}
    />
  );
}
