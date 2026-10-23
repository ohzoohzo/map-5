import { useTranslation } from 'react-i18next';
import { Link } from '../../shared/router';
import PagePlaceholder from '../../shared/ui/PagePlaceholder';

// 시안: design/pinday-explore-v2.png
export default function ExplorePage() {
  const { t } = useTranslation('explore');
  return (
    <PagePlaceholder title={t('title')} subtitle={t('subtitle')} owner="여원" design="pinday-explore-v2.png">
      <p>기존 탐색·일정 화면: <Link href="/workspace">/workspace</Link> (이 화면으로 옮겨올 예정)</p>
    </PagePlaceholder>
  );
}
