import { ShieldCheck } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import BeforeTravelPage from './BeforeTravelPage';

const app: AppDefinition = {
  id: 'before-travel',
  path: '/before-travel',
  order: 55,
  nav: false,
  titleKey: 'beforeTravel:menu',
  descriptionKey: 'beforeTravel:subtitle',
  icon: ShieldCheck,
  component: BeforeTravelPage,
};

export default app;
