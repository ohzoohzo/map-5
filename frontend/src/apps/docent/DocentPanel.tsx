import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Bookmark, BookmarkCheck, FileText, Landmark, Map, MapPin, Mountain, Newspaper, Sparkles } from 'lucide-react';
import type { Place } from '../../api/client';
import { useDocentStatus } from '../../api/generated/docent/docent';
import { tripActions, useTrip } from '../../shared/trip/tripStore';
import { Panel } from './styles';

type Tab = 'story' | 'news';

const SECTIONS = [
  { key: 'History', icon: Landmark },
  { key: 'Feature', icon: Mountain },
  { key: 'Tip', icon: MapPin },
] as const;

/**
 * 장소 하나의 도슨트 해설. DocentPage 와 '언제 갈까?' 사이드 패널에서 함께 쓴다.
 * 사실 문장은 공공데이터 원문만 보여주고, AI 해설·최근 소식은 연동 전 상태를 그대로 표시한다.
 */
export default function DocentPanel({ place }: { place: Place | null }) {
  const { t } = useTranslation('docent');
  const [tab, setTab] = useState<Tab>('story');
  const status = useDocentStatus();
  const saved = useTrip((trip) => (place ? trip.candidateIds.includes(place.id) : false));

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

          <div className="public-intro">
            <h3><FileText size={16} />{t('publicIntro')}</h3>
            <p>{place.description || t('noDescription')}</p>
          </div>

          <div className="sections">
            {SECTIONS.map(({ key, icon: Icon }) => (
              <div className="section" key={key}>
                <strong><Icon size={16} />{t(`section${key}`)}</strong>
                <p>{t(`section${key}Desc`)}</p>
                <p className="pending"><Sparkles size={12} /> {t('aiPending')}</p>
              </div>
            ))}
          </div>

          <div className="refs">
            <h3>{t('references')}</h3>
            <p>{t('referencesHint')}</p>
            {/^https?:\/\//.test(place.url) && (
              <a className="ref-row" href={place.url} target="_blank" rel="noreferrer">
                <span>{t('sourceLink', { source: place.source })}</span>
                <small>
                  {place.source_date ? t('sourceDate', { date: place.source_date }) : t('sourceDateUnknown')}
                  <ArrowUpRight size={14} />
                </small>
              </a>
            )}
          </div>

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
