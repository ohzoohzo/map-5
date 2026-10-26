import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextButton, Typography } from '@montage-ui/core';
import { IconArrowLeft, IconBookmark, IconBookmarkFill } from '@montage-ui/icon';
import { Search } from 'lucide-react';
import { useGetCatalog } from '../../api/generated/travel/travel';
import { navigate } from '../../shared/router';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import DocentPanel from './DocentPanel';
import { Page, Picker } from './styles';

// 시안: design/pinday-docent-v2.png
const REGION_QUERY = '부산';

export default function DocentPage() {
  const { t } = useTranslation('docent');
  const [keyword, setKeyword] = useState('');
  const catalog = useGetCatalog({ region: '', query: REGION_QUERY });
  const selectedId = useTrip((trip) => trip.selectedPlaceId);
  const tripPlace = useTrip((trip) => (selectedId ? trip.places[selectedId] : undefined));
  const candidateIds = useTrip((trip) => trip.candidateIds);

  // 검색어 '부산'은 소개 문구에도 걸리므로 주소 기준으로 한 번 더 거른다
  const places = (catalog.data?.places ?? []).filter((place) => place.address.startsWith('부산'));
  const normalized = keyword.trim().toLowerCase();
  const visible = normalized
    ? places.filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(normalized))
    : places;
  const selected = tripPlace ?? places.find((place) => place.id === selectedId) ?? null;

  return (
    <Page>
      {/* 여행 계획하기·이동 전 확인하기와 같은 머리말 */}
      <header className="page-head">
        <Typography as="h1" variant="title2" weight="bold">{t('title')}</Typography>
        <Typography variant="body1" color="semantic.foreground.neutral.secondary">{t('subtitle')}</Typography>
      </header>

      <div className="layout">
        <Picker aria-label={t('pickerTitle')}>
          {/* 이동 전 확인하기 단계 바의 '계획 단계로 돌아가기'와 같은 버튼 */}
          <TextButton size="small" color="assistive" leadingContent={<IconArrowLeft />} onClick={() => navigate('/explore')}>{t('backToPlanning')}</TextButton>
          <h2>{t('pickerTitle')}</h2>
          <label className="search">
            <Search size={16} />
            <span className="sr-only">{t('pickerSearch')}</span>
            <input type="search" value={keyword} placeholder={t('pickerSearchPlaceholder')} onChange={(event) => setKeyword(event.target.value)} />
          </label>
          {catalog.isLoading && <p className="state">{t('pickerLoading')}</p>}
          {catalog.isError && <p className="state">{t('pickerError')}</p>}
          {catalog.isSuccess && visible.length === 0 && <p className="state">{t('pickerEmpty')}</p>}
          <ul>
            {visible.map((place) => {
              // 후보함에 저장된 곳은 채운 북마크로 표시한다 (어디 갈까?의 저장 버튼과 같은 아이콘)
              const saved = candidateIds.includes(place.id);
              return (
                <li key={place.id}>
                  <button aria-pressed={place.id === selected?.id} onClick={() => tripActions.selectPlace(place.id)}>
                    <span className={saved ? 'bookmark saved' : 'bookmark'} aria-hidden="true">{saved ? <IconBookmarkFill /> : <IconBookmark />}</span>
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.address}</small>
                      {saved && <span className="sr-only">{t('savedCandidate')}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Picker>

        <DocentPanel place={selected} />
      </div>
    </Page>
  );
}
