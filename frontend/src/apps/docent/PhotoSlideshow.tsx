import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { request, type Place } from '../../api/client';
import { getDocentPhotosUrl } from '../../api/generated/docent/docent';
import type { DocentPhotos } from '../../api/generated/model';
import { Slides } from './styles';

const INTERVAL_MS = 3500;

export function usePhotos(place: Place | null) {
  return useQuery({
    queryKey: ['docent', 'photos', place?.id],
    enabled: place !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: ({ signal }) => request<DocentPhotos>(getDocentPhotosUrl({
      place_id: place!.id, name: place!.name, latitude: place!.latitude, longitude: place!.longitude,
    }), signal),
  });
}

/** 한국관광공사 사진 슬라이드. 공공누리 제3유형(변경금지)이 있어 사진을 자르지 않고(contain) 출처·유형을 함께 표시한다. */
export default function PhotoSlideshow({ place, caption }: { place: Place | null; caption?: string }) {
  const { t } = useTranslation('docent');
  const photos = usePhotos(place).data?.photos ?? [];
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => { setIndex(0); }, [place?.id]);
  useEffect(() => {
    if (count < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;
  const photo = photos[Math.min(index, count - 1)]!;
  return (
    <Slides aria-roledescription="carousel" aria-label={t('photosLabel', { name: place?.name })}>
      <div className="slide-frame">
        {photos.map((item, itemIndex) => (
          <img key={item.url} src={item.url} alt={item.title} className={itemIndex === index ? 'active' : ''} loading={itemIndex === 0 ? 'eager' : 'lazy'} />
        ))}
        {caption && <p className="slide-caption">{caption}</p>}
        {count > 1 && (
          <>
            <button className="slide-nav prev" aria-label={t('photoPrev')} onClick={() => setIndex((index - 1 + count) % count)}><ChevronLeft size={18} /></button>
            <button className="slide-nav next" aria-label={t('photoNext')} onClick={() => setIndex((index + 1) % count)}><ChevronRight size={18} /></button>
          </>
        )}
      </div>
      <div className="slide-meta">
        <span>{t('photoCredit', { license: photo.license })}</span>
        <span>{index + 1} / {count}</span>
      </div>
    </Slides>
  );
}
