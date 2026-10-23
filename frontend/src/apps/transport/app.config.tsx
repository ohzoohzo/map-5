import { Route } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import TransportPage from './TransportPage';

// 담당: 선이 · 이 폴더(apps/transport) 안에서만 작업한다
const app: AppDefinition = {
  id: 'transport',
  path: '/transport',
  order: 40,
  titleKey: 'transport:menu',
  descriptionKey: 'transport:subtitle',
  icon: Route,
  component: TransportPage,
};
export default app;
