import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Bookmark, BookmarkCheck, FileText, Landmark, Map, MapPin, Mountain, Newspaper, RefreshCw, Sparkles } from 'lucide-react';
import { ApiError, request, type Place } from '../../api/client';
import { getDocentStoryUrl, useDocentStatus } from '../../api/generated/docent/docent';
import type { DocentStory } from '../../api/generated/model';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import { Panel } from './styles';

type Tab = 'story' | 'news';

const SECTION_ICONS = { history: Landmark, feature: Mountain, tip: MapPin } as const;

// 생성된 fetch 는 오류 응답을 예외로 던지지 않아서, URL 만 쓰고 요청은 공용 request() 로 보낸다
function useStory(place: Place | null) {
  return useQuery({
    queryKey: ['docent', 'story', place?.id],
    enabled: place !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: ({ signal }) => request<DocentStory>(getDocentStoryUrl({
      place_id: place!.id, name: place!.name, address: place!.address,
      latitude: place!.latitude, longitude: place!.longitude,
    }), signal),
  });
}

/**
 * 장소 하나의 도슨트 해설. DocentPage 와 '언제 갈까?' 사이드 패널에서 함께 쓴다.
 * 해설은 공공데이터 근거 원문으로만 만들고, 각 문단에 근거 번호를 붙인다.
 */
export default function DocentPanel({ place }: { place: Place | null }) {
  const { t } = useTranslation('docent');
  const [tab, setTab] = useState<Tab>('story');
  const status = useDocentStatus();
  const story = useStory(place);
  const saved = useTrip((trip) => (place ? trip.candidateIds.includes(place.id) : false));
  const data = story.data;

  return (
    <Panel aria-label={t('menu')}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'story'} onClick={() => setTab('story')}><Map size={16} />{t('tabStory')}</button>
        <button role="tab" aria-selected={tab === 'news'} onClick={() => setTab('news')}><Newspaper size={16} />{t('tabNews')}</button>
      </div>

      {!place ? (
        <p className="empty">{t('noSelection')}</p>
      ) : tab === 'story' ? (
        <div role="tabpanel">
          <span className="label">{t('nowViewing')}</span>
          <h2>{place.name}</h2>
          <p className="address">{[place.category, place.address].filter(Boolean).join(' · ')}</p>

          {story.isLoading && <p className="loading"><Sparkles size={14} /> {t('storyLoading')}</p>}
          {story.isError && (
            <div className="error">
              <p>{story.error instanceof ApiError ? story.error.message : t('storyError')}</p>
              <button className="button outline" onClick={() => story.refetch()}><RefreshCw size={14} />{t('retry')}</button>
            </div>
          )}

          {data?.ready ? (
            <>
              <p className="summary">{data.summary}</p>
              <div className="sections">
                {data.sections.map((section) => {
                  const Icon = SECTION_ICONS[section.key];
                  return (
                    <div className="section" key={section.key}>
                      <strong><Icon size={16} />{section.title}</strong>
                      <p className="section-body">{section.body}</p>
                      {section.reference_indexes.length > 0 && (
                        <p className="ref-chips">{section.reference_indexes.map((index) => <span key={index}>[{index}]</span>)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="ai-note"><Sparkles size={12} /> {t('aiNote', { model: data.model, time: data.generated_at?.slice(0, 16).replace('T', ' ') })}</p>
            </>
          ) : data ? (
            <div className="public-intro">
              <p className="pending">{data.message}</p>
              <h3><FileText size={16} />{t('publicIntro')}</h3>
              <p>{place.description || t('noDescription')}</p>
            </div>
          ) : null}

          {data && data.references.length > 0 && (
            <div className="refs">
              <h3>{t('references')}</h3>
              <p>{t('referencesHint')}</p>
              {data.references.map((reference) => (
                <a className="ref-row" key={reference.index} href={reference.url} target="_blank" rel="noreferrer">
                  <span>[{reference.index}] {reference.label}</span>
                  <small>
                    {reference.source}{reference.date ? ` · ${t('sourceDate', { date: reference.date })}` : ''}
                    <ArrowUpRight size={14} />
                  </small>
                </a>
              ))}
            </div>
          )}

          <div className="actions">
            <button className="button outline" disabled={saved} onClick={() => tripActions.addCandidate(place)}>
              {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {saved ? t('savedCandidate') : t('saveCandidate')}
            </button>
          </div>
        </div>
      ) : (
        <div role="tabpanel">
          <p className="news">{t('newsNotice')}<br />{t('newsPending')}</p>
          <p className="status">{status.data?.ready ? t('statusReady') : t('statusNotReady')}</p>
        </div>
      )}
    </Panel>
  );
}
