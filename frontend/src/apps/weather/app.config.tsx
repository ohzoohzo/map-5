import { CloudRain } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import WeatherPage from './WeatherPage';

// 담당: 현경 · 이 폴더(apps/weather) 안에서만 작업한다
const app: AppDefinition = {
  id: 'weather',
  path: '/weather',
  order: 50,
  titleKey: 'weather:menu',
  descriptionKey: 'weather:subtitle',
  icon: CloudRain,
  component: WeatherPage,
};
export default app;
