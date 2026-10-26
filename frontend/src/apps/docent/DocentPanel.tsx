import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Bookmark, BookmarkCheck, ChevronDown, ChevronLeft, ChevronRight, FileText, Landmark, Map, MapPin, Mountain, Newspaper, RefreshCw, Sparkles } from 'lucide-react';
import { ApiError, request, type Place } from '../../api/client';
import { getDocentNewsUrl, getDocentStoryUrl } from '../../api/generated/docent/docent';
import type { DocentNews, DocentSection, DocentStory } from '../../api/generated/model';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import EmptyStateArt from '../../shared/ui/EmptyStateArt';
import PhotoSlideshow from './PhotoSlideshow';
import { Panel } from './styles';

type Tab = 'story' | 'news';

const SECTION_ICONS = { history: Landmark, feature: Mountain, tip: MapPin } as const;
const SLIDE_MS = 6000;

/**
 * 역사와 문화 · 동네의 특징 · 방문 전 알아두기를 한 번에 하나씩 보여 준다.
 * 6초마다 넘어가고, 마우스를 올리거나 키보드로 들어오면 멈춘다. 움직임 줄이기 설정이면 자동으로 넘기지 않는다.
 */
function SectionCarousel({ sections }: { sections: DocentSection[] }) {
  const { t } = useTranslation('docent');
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const count = sections.length;
  const current = sections[Math.min(index, count - 1)];
  const paused = hovered || focused;

  useEffect(() => {
    if (paused || count < 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % count), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, count]);

  if (!current) return null;
  const Icon = SECTION_ICONS[current.key];
  const go = (next: number) => setIndex((next + count) % count);
  return (
    <section className="section-carousel" aria-roledescription="carousel" aria-label={t('sectionsLabel')}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {/* 자동으로 넘어갈 때는 읽어 주지 않고, 사용자가 멈춰 둔 상태에서 넘길 때만 읽어 준다 */}
      <div className="section" role="group" aria-roledescription="slide" aria-live={paused ? 'polite' : 'off'}
        aria-label={t('sectionSlide', { current: index + 1, total: count, title: current.title })}>
        <div className="section-head">
          <strong><Icon size={16} />{current.title}</strong>
          <span className="section-count">{index + 1} / {count}</span>
        </div>
        <p className="section-body">{current.body}</p>
        {current.reference_indexes.length > 0 && (
          <p className="ref-chips">{current.reference_indexes.map((reference) => <span key={reference}>[{reference}]</span>)}</p>
        )}
      </div>
      {count > 1 && (
        <div className="carousel-controls">
          <button type="button" className="carousel-arrow" aria-label={t('prevSection')} onClick={() => go(index - 1)}><ChevronLeft size={18} /></button>
          <div className="carousel-dots">
            {sections.map((section, each) => (
              <button key={section.key} type="button" className="carousel-dot" aria-label={section.title} aria-current={each === index ? 'true' : undefined} onClick={() => go(each)} />
            ))}
          </div>
          <button type="button" className="carousel-arrow" aria-label={t('nextSection')} onClick={() => go(index + 1)}><ChevronRight size={18} /></button>
        </div>
      )}
    </section>
  );
}

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

// 부산 지역 출처 RSS 조회(1초 내외). '최근 소식' 탭을 열었을 때만 조회한다
function useNews(place: Place | null, enabled: boolean) {
  return useQuery({
    queryKey: ['docent', 'news', place?.id],
    enabled: enabled && place !== null,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: ({ signal }) => request<DocentNews>(getDocentNewsUrl({ place_id: place!.id, name: place!.name }), signal),
  });
}

/**
 * 장소 하나의 도슨트 해설. DocentPage 와 '언제 갈까?' 사이드 패널에서 함께 쓴다.
 * 해설은 공공데이터 근거 원문으로만 만들고, 각 문단에 근거 번호를 붙인다.
 */
export default function DocentPanel({ place }: { place: Place | null }) {
  const { t } = useTranslation('docent');
  const [tab, setTab] = useState<Tab>('story');
  const story = useStory(place);
  const news = useNews(place, tab === 'news');
  const saved = useTrip((trip) => (place ? trip.candidateIds.includes(place.id) : false));
  const data = story.data;
  // 사진 오른쪽 간단 설명: AI 요약이 있으면 그것, 없으면 공공데이터 소개
  const heroText = data?.ready && data.summary
    ? <p>{data.summary}</p>
    : place?.description ? <p className="muted">{place.description}</p> : null;

  return (
    <Panel aria-label={t('menu')}>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'story'} onClick={() => setTab('story')}><Map size={16} />{t('tabStory')}</button>
        <button role="tab" aria-selected={tab === 'news'} onClick={() => setTab('news')}><Newspaper size={16} />{t('tabNews')}</button>
      </div>

      {!place ? (
        <div className="empty">
          <EmptyStateArt kind="docent" size={160} />
          <p>{t('noSelection')}</p>
        </div>
      ) : tab === 'story' ? (
        <div role="tabpanel">
          <span className="label">{t('nowViewing')}</span>
          <h2>{place.name}</h2>
          <p className="address">{[place.category, place.address].filter(Boolean).join(' · ')}</p>
          <PhotoSlideshow place={place} caption={story.isLoading ? t('storyLoadingCaption', { name: place.name }) : undefined}>{heroText}</PhotoSlideshow>

          {story.isLoading && <p className="loading"><Sparkles size={14} /> {t('storyLoading')}</p>}
          {story.isError && (
            <div className="error">
              <p>{story.error instanceof ApiError ? story.error.message : t('storyError')}</p>
              <button className="button outline" onClick={() => story.refetch()}><RefreshCw size={14} />{t('retry')}</button>
            </div>
          )}

          {data?.ready ? (
            <>
              <SectionCarousel key={place.id} sections={data.sections} />
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
            <details className="refs">
              <summary><span>{t('referencesToggle', { count: data.references.length })}</span><ChevronDown size={16} aria-hidden="true" /></summary>
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
            </details>
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
          <span className="label">{t('nowViewing')}</span>
          <h2>{place.name}</h2>
          <p className="news">{t('newsNotice')}</p>
          <PhotoSlideshow place={place} caption={news.isLoading ? t('newsLoadingCaption', { name: place.name }) : undefined}>{heroText}</PhotoSlideshow>
          {news.isLoading && <p className="loading"><Sparkles size={14} /> {t('newsLoading')}</p>}
          {news.isError && (
            <div className="error">
              <p>{news.error instanceof ApiError ? news.error.message : t('newsError')}</p>
              <button className="button outline" onClick={() => news.refetch()}><RefreshCw size={14} />{t('retry')}</button>
            </div>
          )}
          {news.data && (
            <>
              <p className="pending">{news.data.message}</p>
              <ul className="news-list">
                {news.data.items.map((item) => (
                  <li key={item.url}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <strong>{item.title}<ArrowUpRight size={14} /></strong>
                      <span className="news-meta">{item.source_name} · {t('publishedDate', { date: item.published_date })}</span>
                      {item.summary && <span className="news-summary">{item.summary}</span>}
                    </a>
                  </li>
                ))}
              </ul>
              {news.data.searched_at && (
                <p className="ai-note">{t('newsNote', { time: news.data.searched_at.slice(0, 16).replace('T', ' ') })}</p>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
