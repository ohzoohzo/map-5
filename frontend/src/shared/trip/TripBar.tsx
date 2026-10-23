import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Option, SectionMessage, Select, TextButton, TextField, Typography } from '@montage-ui/core';
import { IconBookmark, IconCalendar, IconLocation, IconPencil } from '@montage-ui/icon';
import { useTranslation } from 'react-i18next';
import { getCatalog } from '../../api/client';
import { TRAVEL_TEST_IDS } from '../testIds';
import { addDays, formatDay, provincesOf, shortProvince, todayIso, tripLengthLabel } from '../regions';
import { navigate } from '../router';
import { scheduledCount, tripActions, useTrip, useTripStorageIssue } from './tripStore';

// 시·도 목록은 전체 카탈로그의 region 에서 만든다. 탐색 화면과 같은 queryKey 라 한 번만 받는다.
export const regionsQuery = { queryKey: ['travel', 'catalog', '', ''], queryFn: ({ signal }: { signal: AbortSignal }) => getCatalog('', '', signal), staleTime: Infinity };
const MAX_TRIP_DAYS = 7;
// 데이터에 '강원도'와 '강원특별자치도'처럼 짧은 이름이 같은 시·도가 함께 있으면 전체 이름으로 구분한다.
const optionLabel = (province: string, all: string[]) => all.filter((other) => shortProvince(other) === shortProvince(province)).length > 1 ? province : shortProvince(province);

/** 어디 갈까?·언제 갈까? 위의 여행 조건 바: 목적지·날짜·후보 수·일정 수와 조건 수정 */
export default function TripBar({ page }: { page: 'explore' | 'schedule' }) {
  const { t } = useTranslation('trip');
  const trip = useTrip((current) => current);
  const storageIssue = useTripStorageIssue();
  const [editing, setEditing] = useState(false);
  const open = editing || trip.destination === '';
  const dates = trip.startDate ? `${formatDay(trip.startDate)} – ${formatDay(trip.endDate)}` : t('datesUndecided');

  return (
    <div className="trip-bar-wrap">
      <div className="trip-bar">
        <span className="trip-fact"><IconLocation />{trip.destination ? `${shortProvince(trip.destination)} · ${tripLengthLabel(trip.days.length)}` : t('destinationUndecided')}</span>
        <span className="trip-fact"><IconCalendar />{dates}</span>
        {trip.destination !== '' && <TextButton size="small" color="assistive" leadingContent={<IconPencil />} onClick={() => setEditing(!editing)} aria-expanded={open}>{t('editConditions')}</TextButton>}
        <span className="trip-counts">
          <button type="button" className={page === 'explore' ? 'count-chip active' : 'count-chip'} onClick={() => navigate('/explore')}><IconBookmark />{t('candidateCount')} <strong data-testid={TRAVEL_TEST_IDS.CANDIDATE_COUNT}>{trip.candidateIds.length}</strong>{t('placeUnit')}</button>
          <button type="button" className={page === 'schedule' ? 'count-chip active' : 'count-chip'} onClick={() => navigate('/schedule')}><IconCalendar />{t('scheduledCount')} <strong data-testid={TRAVEL_TEST_IDS.SCHEDULED_COUNT}>{scheduledCount(trip)}</strong>{t('placeUnit')}</button>
        </span>
      </div>
      {open && <ConditionsForm key={`${trip.destination}-${trip.startDate}-${trip.endDate}`} onDone={() => setEditing(false)} />}
      {storageIssue && <SectionMessage variant="cautionary" description={t(storageIssue)} trailingButton={<TextButton size="small" onClick={tripActions.retryStorage}>{t('storageRetry')}</TextButton>} />}
    </div>
  );
}

function ConditionsForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('trip');
  const trip = useTrip((current) => current);
  const regions = useQuery(regionsQuery);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate || todayIso());
  // 처음 여행은 시안처럼 2박 3일로 시작한다.
  const [dayCount, setDayCount] = useState(String(trip.days.length ? Math.min(trip.days.length, MAX_TRIP_DAYS) : 3));
  const returning = trip.days.slice(Number(dayCount)).reduce((total, day) => total + day.items.length, 0);
  const provinces = provincesOf(regions.data?.regions ?? []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destination || !startDate) return;
    tripActions.setTrip(destination, startDate, addDays(startDate, Number(dayCount) - 1));
    onDone();
  }

  return (
    <form className="conditions-form" onSubmit={submit} aria-labelledby="conditions-title">
      <Typography id="conditions-title" as="h2" variant="headline2" weight="bold">{t(trip.destination ? 'conditionsEditTitle' : 'conditionsStartTitle')}</Typography>
      <div className="conditions-fields">
        <label className="field"><span>{t('destinationLabel')}</span>
          <Select value={destination} onChange={setDestination} placeholder={t(regions.isLoading ? 'loading' : 'destinationPlaceholder')} disabled={!provinces.length} aria-label={t('destinationLabel')} width="100%">
            {provinces.map((province) => <Option key={province} value={province}>{optionLabel(province, provinces)}</Option>)}
          </Select>
        </label>
        <label className="field"><span>{t('startDateLabel')}</span>
          <TextField type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required aria-label={t('startDateLabel')} />
        </label>
        <label className="field"><span>{t('lengthLabel')}</span>
          <Select value={dayCount} onChange={setDayCount} aria-label={t('lengthLabel')} width="100%">
            {Array.from({ length: MAX_TRIP_DAYS }, (_, index) => <Option key={index} value={String(index + 1)}>{tripLengthLabel(index + 1)}</Option>)}
          </Select>
        </label>
        <Button type="submit" variant="solid" color="primary" disabled={!destination || !startDate}>{t(trip.destination ? 'conditionsSave' : 'conditionsStart')}</Button>
      </div>
      {regions.isError && <Typography variant="caption1" color="semantic.foreground.negative.primary" role="alert">{t('regionsError')}</Typography>}
      {returning > 0 && <Typography variant="caption1" color="semantic.foreground.cautionary.primary">{t('shortenNotice', { count: returning })}</Typography>}
    </form>
  );
}
