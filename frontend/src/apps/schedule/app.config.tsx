import { CalendarDays } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import SchedulePage from './SchedulePage';

// 담당: 여원 · 이 폴더(apps/schedule) 안에서만 작업한다
const app: AppDefinition = {
  id: 'schedule',
  path: '/schedule',
  order: 30,
  titleKey: 'schedule:menu',
  descriptionKey: 'schedule:subtitle',
  icon: CalendarDays,
  component: SchedulePage,
};
export default app;
