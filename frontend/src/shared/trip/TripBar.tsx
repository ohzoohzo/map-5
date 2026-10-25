import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Option, SectionMessage, Select, TextButton, TextField, Typography } from '@montage-ui/core';
import { IconBookmark, IconCalendar, IconLocation, IconPencil } from '@montage-ui/icon';
import { useTranslation } from 'react-i18next';
import { getCatalog } from '../../api/client';
import { TRAVEL_TEST_IDS } from '../testIds';
import { addDays, formatDay, provincesOf, resolveProvince, shortProvince, todayIso, tripLengthLabel } from '../regions';
import { navigate } from '../router';
import { scheduledCount, tripActions, useTrip, useTripStorageIssue } from './tripStore';

// 시·도 목록은 전체 카탈로그의 region 에서 만든다. 탐색 화면과 같은 queryKey 라 한 번만 받는다.
export const regionsQuery = { queryKey: ['travel', 'catalog', '', ''], queryFn: ({ signal }: { signal: AbortSignal }) => getCatalog('', '', signal), staleTime: Infinity };
const MAX_TRIP_DAYS = 7;
// 데이터에 '강원도'와 '강원특별자치도'처럼 짧은 이름이 같은 시·도가 함께 있으면 전체 이름으로 구분한다.
const optionLabel = (province: string, all: string[]) => all.filter((other) => shortProvince(other) === shortProvince(province)).length > 1 ? province : shortProvince(province);

/** 어디 갈까?·언제 갈까? 위의 여행 조건 바: 목적지·날짜·후보 수·일정 수와 조건 수정 */
export default function TripBar({ page, showStepLabels = false }: { page: 'explore' | 'schedule'; showStepLabels?: boolean }) {
  const { t } = useTranslation('trip');
  const trip = useTrip((current) => current);
  const storageIssue = useTripStorageIssue();
  const regions = useQuery(regionsQuery);
  const [editing, setEditing] = useState(false);
  // 홈이 저장한 짧은 이름('부산')도 받는다. 시·도를 특정할 수 없을 때만(목록을 받은 뒤) 조건 폼을 연다.
  const unresolved = trip.destination !== '' && regions.isSuccess && resolveProvince(trip.destination, provincesOf(regions.data.regions)) === '';
  const open = editing || trip.destination === '' || unresolved;
  const dates = trip.startDate ? `${formatDay(trip.startDate)} – ${formatDay(trip.endDate)}` : t('datesUndecided');

  return (
    <div className="trip-bar-wrap">
      <div className="trip-bar">
        <span className="trip-fact"><IconLocation />{trip.destination ? `${shortProvince(trip.destination)} · ${tripLengthLabel(trip.days.length)}` : t('destinationUndecided')}</span>
        <span className="trip-fact"><IconCalendar />{dates}</span>
        {trip.destination !== '' && <TextButton size="small" color="assistive" leadingContent={<IconPencil />} onClick={() => setEditing(!editing)} aria-expanded={open}>{t('editConditions')}</TextButton>}
        <span className="trip-counts">
          <button type="button" className={page === 'explore' ? 'count-chip active' : 'count-chip'} aria-label={showStepLabels ? t('candidateStep') : undefined} onClick={() => navigate('/explore')}>
            <IconBookmark />
            {showStepLabels ? t('candidateStep') : <>{t('candidateCount')} <strong data-testid={TRAVEL_TEST_IDS.CANDIDATE_COUNT}>{trip.candidateIds.length}</strong>{t('placeUnit')}</>}
            {showStepLabels && <span className="sr-only" aria-hidden="true" data-testid={TRAVEL_TEST_IDS.CANDIDATE_COUNT}>{trip.candidateIds.length}</span>}
          </button>
          <button type="button" className={page === 'schedule' ? 'count-chip active' : 'count-chip'} aria-label={showStepLabels ? t('scheduleStep') : undefined} onClick={() => navigate('/schedule')}>
            <IconCalendar />
            {showStepLabels ? t('scheduleStep') : <>{t('scheduledCount')} <strong data-testid={TRAVEL_TEST_IDS.SCHEDULED_COUNT}>{scheduledCount(trip)}</strong>{t('placeUnit')}</>}
            {showStepLabels && <span className="sr-only" aria-hidden="true" data-testid={TRAVEL_TEST_IDS.SCHEDULED_COUNT}>{scheduledCount(trip)}</span>}
          </button>
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
  const provinces = provincesOf(regions.data?.regions ?? []);
  // 짧은 이름으로 저장된 목적지는 목록이 오면 전체 이름으로 맞춰 고른 상태로 보여준다.
  const shown = provinces.includes(destination) ? destination : resolveProvince(destination, provinces);
  const [startDate, setStartDate] = useState(trip.startDate || todayIso());
  // 처음 여행은 시안처럼 2박 3일로 시작한다.
  const [dayCount, setDayCount] = useState(String(trip.days.length ? Math.min(trip.days.length, MAX_TRIP_DAYS) : 3));
  const returning = trip.days.slice(Number(dayCount)).reduce((total, day) => total + day.items.length, 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shown || !startDate) return;
    tripActions.setTrip(shown, startDate, addDays(startDate, Number(dayCount) - 1));
    onDone();
  }

  return (
    <form className="conditions-form" onSubmit={submit} aria-labelledby="conditions-title">
      <Typography id="conditions-title" as="h2" variant="headline2" weight="bold">{t(trip.destination ? 'conditionsEditTitle' : 'conditionsStartTitle')}</Typography>
      <div className="conditions-fields">
        <label className="field"><span>{t('destinationLabel')}</span>
          <Select value={shown} onChange={setDestination} placeholder={t(regions.isLoading ? 'loading' : 'destinationPlaceholder')} disabled={!provinces.length} aria-label={t('destinationLabel')} width="100%">
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
        <Button type="submit" variant="solid" color="primary" disabled={!shown || !startDate}>{t(trip.destination ? 'conditionsSave' : 'conditionsStart')}</Button>
      </div>
      {regions.isError && <Typography variant="caption1" color="semantic.foreground.negative.primary" role="alert">{t('regionsError')}</Typography>}
      {returning > 0 && <Typography variant="caption1" color="semantic.foreground.cautionary.primary">{t('shortenNotice', { count: returning })}</Typography>}
    </form>
  );
}
