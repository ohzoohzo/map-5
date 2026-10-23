import { Heart } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import TastePage from './TastePage';

// 담당: 우현 · 이 폴더(apps/taste) 안에서만 작업한다
const app: AppDefinition = {
  id: 'taste',
  path: '/taste',
  order: 15,
  nav: false,
  titleKey: 'taste:menu',
  descriptionKey: 'taste:subtitle',
  icon: Heart,
  component: TastePage,
};
export default app;
