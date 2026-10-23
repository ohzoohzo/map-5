import { Search } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import ExplorePage from './ExplorePage';

// 담당: 여원 · 이 폴더(apps/explore) 안에서만 작업한다
const app: AppDefinition = {
  id: 'explore',
  path: '/explore',
  order: 20,
  titleKey: 'explore:menu',
  descriptionKey: 'explore:subtitle',
  icon: Search,
  component: ExplorePage,
};
export default app;
