import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../shared/ui/PagePlaceholder';

// 시안: design/pinday-taste-v2.png
export default function TastePage() {
  const { t } = useTranslation('taste');
  return (
    <PagePlaceholder title={t('title')} subtitle={t('subtitle')} owner="우현" design="pinday-taste-v2.png"></PagePlaceholder>
  );
}
