import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../shared/ui/PagePlaceholder';

// 시안: design/pinday-docent-v2.png
export default function DocentPage() {
  const { t } = useTranslation('docent');
  return (
    <PagePlaceholder title={t('title')} subtitle={t('subtitle')} owner="명근" design="pinday-docent-v2.png"></PagePlaceholder>
  );
}
