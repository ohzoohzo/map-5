import { useTranslation } from 'react-i18next';
import PagePlaceholder from '../../shared/ui/PagePlaceholder';

// 시안: design/pinday-weather-v2.png
export default function WeatherPage() {
  const { t } = useTranslation('weather');
  return (
    <PagePlaceholder title={t('title')} subtitle={t('subtitle')} owner="현경" design="pinday-weather-v2.png"></PagePlaceholder>
  );
}
