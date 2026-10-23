import { useEffect, useRef, useState, type ReactNode } from 'react';
import styled from '@emotion/styled';
import { ImageOff, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Place } from '../../api/client';
import { color, radius } from '../design/tokens';
import { usePlacePhotos } from './usePlacePhotos';

export interface PlacePhotoProps {
  place: Place;
  variant: 'card' | 'thumbnail' | 'popup';
  className?: string;
  children?: ReactNode;
}

const Photo = styled.span`
  display: grid;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  color: ${color.textMuted};
  font-weight: 400;
  text-align: left;
  .photo-frame { display: grid; place-items: center; width: 100%; height: 180px; overflow: hidden; background: ${color.bg}; }
  .photo-frame img { display: block; width: 100%; height: 100%; min-height: 0; object-fit: contain; }
  .photo-state { display: grid; justify-items: center; gap: 6px; padding: 8px; font-size: 12px; line-height: 1.4; text-align: center; }
  .photo-state svg { width: 24px; height: 24px; }
  &[data-variant='popup'] { border-radius: ${radius.sm}; }
  &[data-variant='popup'] .photo-frame { height: 150px; }
  &[data-variant='thumbnail'] { grid-template-columns: 64px minmax(0, 1fr); gap: 0 10px; align-items: center; }
  &[data-variant='thumbnail'] .photo-frame { height: 64px; border-radius: ${radius.sm}; }
  &[data-variant='thumbnail'] .photo-copy { min-width: 0; }
  &[data-variant='thumbnail'] .photo-state { gap: 3px; padding: 3px; font-size: 10px; }
  &[data-variant='thumbnail'] .photo-state svg { width: 20px; height: 20px; }
`;

/** 사진은 원본 비율로 표시하고, 사진별 출처·이용조건은 출처 페이지에서 제공한다. */
export default function PlacePhoto({ place, variant, className, children }: PlacePhotoProps) {
  const { t } = useTranslation('media');
  const element = useRef<HTMLSpanElement>(null);
  const [visiblePlaceId, setVisiblePlaceId] = useState<string | null>(null);
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const photos = usePlacePhotos(place, visiblePlaceId === place.id);
  const photo = photos.data?.photos[0];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') { setVisiblePlaceId(place.id); return; }
    const node = element.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisiblePlaceId(place.id);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [place.id]);

  const broken = photo !== undefined && brokenUrl === photo.url;
  const unavailable = photos.isError || photos.isSuccess && !photo || broken;
  const reason = t(broken ? 'photoBroken' : photos.isError ? 'photoError' : 'photoEmpty');
  return (
    <Photo ref={element} data-variant={variant} className={className}>
      <span className="photo-frame">
        {photo && !broken ? (
          <img src={photo.url} alt={t('photoLabel', { name: place.name })} title={photo.title} loading="lazy" decoding="async" onError={() => setBrokenUrl(photo.url)} />
        ) : (
          <span className="photo-state" title={unavailable ? reason : undefined} role={unavailable ? 'img' : 'status'} aria-label={unavailable ? t('photoUnavailableLabel', { name: place.name }) : undefined}>
            {unavailable ? <ImageOff aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
            <span>{t(unavailable ? 'photoUnavailable' : 'photoLoading')}</span>
          </span>
        )}
      </span>
      {variant === 'thumbnail' && children && <span className="photo-copy">{children}</span>}
    </Photo>
  );
}
