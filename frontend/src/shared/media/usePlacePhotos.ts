import { useQuery } from '@tanstack/react-query';
import { request, type Place } from '../../api/client';
import { getDocentPhotosUrl } from '../../api/generated/docent/docent';
import type { DocentPhoto, DocentPhotos } from '../../api/generated/model';

const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const httpUrl = (value: unknown): value is string => {
  if (!nonEmptyString(value)) return false;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
};

function isPhoto(value: unknown): value is DocentPhoto {
  if (typeof value !== 'object' || value === null) return false;
  return 'url' in value && httpUrl(value.url)
    && 'thumbnail_url' in value && httpUrl(value.thumbnail_url)
    && 'title' in value && typeof value.title === 'string'
    && 'license' in value && nonEmptyString(value.license);
}

export function isPlacePhotos(value: unknown, placeId: string): value is DocentPhotos {
  if (typeof value !== 'object' || value === null
    || !('place_id' in value) || value.place_id !== placeId
    || !('photos' in value) || !Array.isArray(value.photos) || !value.photos.every(isPhoto)
    || !('source' in value) || !nonEmptyString(value.source)
    || !('source_url' in value) || !httpUrl(value.source_url)) {
    return false;
  }
  return true;
}

function readPhotos(value: unknown, placeId: string): DocentPhotos {
  if (!isPlacePhotos(value, placeId)) throw new Error('Invalid place photo response');
  return { place_id: placeId, photos: value.photos, source: value.source, source_url: value.source_url };
}

/** 도슨트와 장소 카드가 같은 장소 사진 요청·캐시를 공유한다. */
export function usePlacePhotos(place: Place | null, enabled = true) {
  return useQuery<DocentPhotos>({
    queryKey: ['docent', 'photos', place?.id],
    enabled: enabled && place !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async ({ signal }) => {
      if (place === null) throw new Error('A place is required to load photos');
      const response = await request<unknown>(getDocentPhotosUrl({
        place_id: place.id, name: place.name, latitude: place.latitude, longitude: place.longitude,
      }), signal);
      return readPhotos(response, place.id);
    },
  });
}
