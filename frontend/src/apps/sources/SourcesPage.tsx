import { useState } from 'react';
import styled from '@emotion/styled';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { color, layout, radius } from '../../shared/design/tokens';
import { isPlacePhotos } from '../../shared/media/usePlacePhotos';
import { Link } from '../../shared/router';

interface PhotoSource {
  url: string;
  title: string;
  source: string;
  sourceUrl: string;
  license: string;
}

function loadedPhotoSources(client: QueryClient): PhotoSource[] {
  const photos = new Map<string, PhotoSource>();
  for (const [key, data] of client.getQueriesData<unknown>({ queryKey: ['docent', 'photos'], predicate: (query) => query.state.status === 'success' })) {
    if (key.length !== 3 || typeof key[2] !== 'string' || !isPlacePhotos(data, key[2])) continue;
    for (const photo of data.photos) {
      const entry = { url: photo.url, title: photo.title, source: data.source, sourceUrl: data.source_url, license: photo.license };
      const identity = JSON.stringify([entry.url, entry.title, entry.source, entry.sourceUrl, entry.license]);
      photos.set(identity, entry);
    }
  }
  return [...photos.values()];
}

const providers = [
  { key: 'catalog', url: 'https://www.data.go.kr/data/15021141/standard.do' },
  { key: 'tour', url: 'https://www.data.go.kr/data/15101578/openapi.do' },
  { key: 'map', url: 'https://apis.map.kakao.com/web/' },
  { key: 'local', url: 'https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword' },
  { key: 'weather', url: 'https://openweathermap.org/api/forecast5' },
] as const;

const Page = styled.div`
  max-width: 1000px;
  margin: auto;
  padding: 32px 32px 24px;
  color: ${color.text};
  h1 { margin-bottom: 8px; font-size: 28px; }
  h2 { margin: 0 0 8px; font-size: 20px; }
  .intro, .section-note { color: ${color.textSub}; font-size: 14px; line-height: 1.7; }
  section { margin-top: 32px; }
  ul { list-style: none; padding: 0; margin: 16px 0 0; }
  a { color: ${color.primary}; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; }
  a:focus-visible { outline: 2px solid ${color.primary}; outline-offset: 3px; border-radius: ${radius.sm}; }
  .provider-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .provider-list li, .photo-list li { padding: 20px; border: 1px solid ${color.border}; border-radius: ${radius.md}; background: ${color.surface}; min-width: 0; }
  .provider-list a { display: inline-flex; align-items: center; gap: 6px; min-height: ${layout.minTouch}; font-size: 15px; font-weight: 600; }
  .provider-list p { font-size: 13px; color: ${color.textSub}; line-height: 1.6; }
  .photo-list { display: grid; gap: 12px; }
  .photo-list h3 { margin: 0; font-size: 16px; overflow-wrap: anywhere; }
  .photo-list dl { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 8px 12px; margin: 16px 0 8px; font-size: 13px; line-height: 1.7; }
  .photo-list dt { color: ${color.textSub}; }
  .photo-list dd { margin: 0; overflow-wrap: anywhere; }
  .photo-links { display: flex; gap: 4px 20px; flex-wrap: wrap; }
  .photo-links a { display: inline-flex; gap: 6px; align-items: center; min-height: ${layout.minTouch}; font-size: 13px; }
  .empty-photos { margin-top: 16px; padding: 24px; border: 1px solid ${color.border}; border-radius: ${radius.md}; background: ${color.surface}; color: ${color.textSub}; line-height: 1.7; }
  .return-links { display: flex; gap: 8px 24px; flex-wrap: wrap; margin-top: 32px; }
  .return-links a { display: inline-flex; align-items: center; gap: 6px; min-height: ${layout.minTouch}; font-size: 14px; font-weight: 600; }
  @media (max-width: 720px) {
    padding: 24px 16px;
    h1 { font-size: 24px; }
    .provider-list { grid-template-columns: 1fr; }
    .provider-list li, .photo-list li { padding: 16px; }
  }
`;

export default function SourcesPage() {
  const { t } = useTranslation('sources');
  const client = useQueryClient();
  const [photos] = useState(() => loadedPhotoSources(client));

  return <Page>
    <h1>{t('title')}</h1>
    <p className="intro">{t('subtitle')}</p>
    <section aria-labelledby="data-sources-heading">
      <h2 id="data-sources-heading">{t('dataHeading')}</h2>
      <ul className="provider-list">
        {providers.map(({ key, url }) => <li key={key}>
          <a href={url} target="_blank" rel="noopener noreferrer">{t(`${key}Name`)}<ExternalLink size={15} aria-hidden="true" /></a>
          <p>{t(`${key}Description`)}</p>
        </li>)}
      </ul>
    </section>
    <section aria-labelledby="photo-sources-heading">
      <h2 id="photo-sources-heading">{t('photosHeading')}</h2>
      <p className="section-note">{t('photosDescription')}</p>
      {photos.length ? <>
        <ul className="photo-list">
          {photos.map((photo) => <li key={JSON.stringify(photo)}>
            <h3>{photo.title || t('untitledPhoto')}</h3>
            <dl><dt>{t('provider')}</dt><dd>{photo.source}</dd><dt>{t('license')}</dt><dd>{photo.license}</dd></dl>
            <div className="photo-links">
              <a href={photo.url} target="_blank" rel="noopener noreferrer">{t('originalPhoto')}<ExternalLink size={15} aria-hidden="true" /></a>
              <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{t('sourceData')}<ExternalLink size={15} aria-hidden="true" /></a>
            </div>
          </li>)}
        </ul>
        <p className="section-note">{t('photosSession')}</p>
      </> : <p className="empty-photos">{t('photosEmpty')}</p>}
    </section>
    <nav className="return-links" aria-label={t('backExplore')}>
      <Link href="/explore"><ArrowLeft size={16} aria-hidden="true" />{t('backExplore')}</Link>
      <Link href="/schedule">{t('backSchedule')}</Link>
    </nav>
  </Page>;
}
