import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
import { useGetCatalog } from '../../api/generated/travel/travel';
import { Link } from '../../shared/router';
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

  // 검색어 '부산'은 소개 문구에도 걸리므로 주소 기준으로 한 번 더 거른다
  const places = (catalog.data?.places ?? []).filter((place) => place.address.startsWith('부산'));
  const normalized = keyword.trim().toLowerCase();
  const visible = normalized
    ? places.filter((place) => `${place.name} ${place.address}`.toLowerCase().includes(normalized))
    : places;
  const selected = tripPlace ?? places.find((place) => place.id === selectedId) ?? null;

  return (
    <Page>
      <div className="page-title">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <div className="layout">
        <Picker aria-label={t('pickerTitle')}>
          <Link href="/schedule" className="back"><ArrowLeft size={14} />{t('backToSchedule')}</Link>
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
            {visible.map((place) => (
              <li key={place.id}>
                <button aria-pressed={place.id === selected?.id} onClick={() => tripActions.selectPlace(place.id)}>
                  <MapPin size={16} />
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.address}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Picker>

        <DocentPanel place={selected} />
      </div>
    </Page>
  );
}
