import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../api/client';
import { usePlacePhotos } from '../../shared/media/usePlacePhotos';
import { Slides } from './styles';

const INTERVAL_MS = 3500;

export { usePlacePhotos as usePhotos } from '../../shared/media/usePlacePhotos';

/** 한국관광공사 사진 슬라이드. 공공누리 제3유형(변경금지)이 있어 사진을 자르지 않고(contain) 출처·유형을 함께 표시한다. */
export default function PhotoSlideshow({ place, caption, children }: { place: Place | null; caption?: string; children?: ReactNode }) {
  const { t } = useTranslation('docent');
  const photos = usePlacePhotos(place).data?.photos ?? [];
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => { setIndex(0); }, [place?.id]);
  useEffect(() => {
    if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return children ? <Slides><div className="hero-text">{children}</div></Slides> : null;
  const photo = photos[Math.min(index, count - 1)]!;
  return (
    <Slides>
      <div className="slide-box" aria-roledescription="carousel" aria-label={t('photosLabel', { name: place?.name })}>
        <div className="slide-frame">
          {photos.map((item, itemIndex) => (
            <img key={item.url} src={item.url} alt={item.title} className={itemIndex === index ? 'active' : ''} loading={itemIndex === 0 ? 'eager' : 'lazy'} />
          ))}
          {caption && <p className="slide-caption">{caption}</p>}
        </div>
        <div className="slide-meta">
          <span>{t('photoCredit', { license: photo.license })}</span>
          <span>{index + 1} / {count}</span>
        </div>
      </div>
      {children && <div className="hero-text">{children}</div>}
    </Slides>
  );
}
