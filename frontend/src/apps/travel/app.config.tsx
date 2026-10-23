import { Compass } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import TravelWorkspace from './TravelWorkspace';

// 담당: 여원 · 기존 탐색+일정 작업 공간. 어디 갈까?/언제 갈까? 로 옮겨지면 정리한다
const app: AppDefinition = {
  id: 'travel',
  path: '/workspace',
  order: 90,
  nav: false,
  titleKey: 'appTitle',
  descriptionKey: 'appDescription',
  icon: Compass,
  component: TravelWorkspace,
};
export default app;
