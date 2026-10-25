import styled from '@emotion/styled';
import { Button, Typography } from '@montage-ui/core';
import { CloudRain, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { color } from '../../shared/design/tokens';
import { navigate } from '../../shared/router';
import PinDayPage from '../../shared/ui/PinDayPage';

const BeforeTravelLayout = styled(PinDayPage)`
  .before-travel-page { display: grid; gap: 28px; max-width: 1040px; margin: 28px auto 48px; }
  .before-travel-heading { display: grid; gap: 10px; }
  .before-travel-heading h1 { color: ${color.navy}; font-size: clamp(30px, 4vw, 48px); font-weight: 800; letter-spacing: -1.2px; }
  .before-travel-heading p { color: ${color.textSub}; font-size: 17px; line-height: 1.6; }
  .before-travel-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
  .before-travel-option { display: grid; justify-items: start; gap: 18px; padding: 28px; border: 1px solid ${color.border}; border-radius: 20px; background: ${color.surface}; box-shadow: 0 8px 24px color-mix(in srgb, ${color.navy} 8%, transparent); }
  .before-travel-option > svg { width: 32px; height: 32px; color: ${color.primary}; }
  .before-travel-option h2 { color: ${color.navy}; font-size: 24px; font-weight: 750; }
  .before-travel-option p { min-height: 48px; color: ${color.textSub}; line-height: 1.6; }
  @media (max-width: 720px) {
    .before-travel-page { margin: 20px auto 32px; }
    .before-travel-options { grid-template-columns: 1fr; gap: 14px; }
    .before-travel-option { padding: 22px; }
  }
`;

export default function BeforeTravelPage() {
  const { t } = useTranslation('beforeTravel');
  return (
    <BeforeTravelLayout>
      <div className="before-travel-page">
        <header className="before-travel-heading">
          <Typography as="h1" variant="title1" weight="bold">{t('title')}</Typography>
          <Typography as="p" variant="body1">{t('subtitle')}</Typography>
        </header>
        <div className="before-travel-options">
          <article className="before-travel-option">
            <Route aria-hidden="true" />
            <Typography as="h2" variant="title3" weight="bold">{t('transportTitle')}</Typography>
            <Typography as="p" variant="body1">{t('transportDescription')}</Typography>
            <Button variant="solid" color="primary" onClick={() => navigate('/transport')}>{t('openTransport')}</Button>
          </article>
          <article className="before-travel-option">
            <CloudRain aria-hidden="true" />
            <Typography as="h2" variant="title3" weight="bold">{t('weatherTitle')}</Typography>
            <Typography as="p" variant="body1">{t('weatherDescription')}</Typography>
            <Button variant="solid" color="primary" onClick={() => navigate('/weather')}>{t('openWeather')}</Button>
          </article>
        </div>
      </div>
    </BeforeTravelLayout>
  );
}
