import { Sparkles } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import DocentPage from './DocentPage';

// 담당: 명근 · 이 폴더(apps/docent) 안에서만 작업한다
const app: AppDefinition = {
  id: 'docent',
  path: '/docent',
  order: 60,
  titleKey: 'docent:menu',
  descriptionKey: 'docent:subtitle',
  icon: Sparkles,
  component: DocentPage,
};
export default app;
