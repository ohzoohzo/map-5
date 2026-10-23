import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../shared/ui/PagePlaceholder';

// 시안: design/pinday-transport-v2.png
export default function TransportPage() {
  const { t } = useTranslation('transport');
  return (
    <PagePlaceholder title={t('title')} subtitle={t('subtitle')} owner="선이" design="pinday-transport-v2.png"></PagePlaceholder>
  );
}
