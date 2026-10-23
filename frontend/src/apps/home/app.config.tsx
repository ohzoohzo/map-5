import { House } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import HomePage from './HomePage';

// 담당: 우현 · 이 폴더(apps/home) 안에서만 작업한다
const app: AppDefinition = {
  id: 'home',
  path: '/',
  order: 10,
  titleKey: 'home:menu',
  descriptionKey: 'home:subtitle',
  icon: House,
  component: HomePage,
};
export default app;
