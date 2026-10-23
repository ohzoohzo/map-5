import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../shared/ui/PagePlaceholder';

// 시안: design/pinday-home-v3.png
export default function HomePage() {
  const { t } = useTranslation('home');
  return (
    <PagePlaceholder title={t('title')} subtitle={t('subtitle')} owner="우현" design="pinday-home-v3.png"></PagePlaceholder>
  );
}
