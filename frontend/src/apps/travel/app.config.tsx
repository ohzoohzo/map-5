import { Compass } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import TravelWorkspace from './TravelWorkspace';

const app: AppDefinition = {
  id: 'travel',
  titleKey: 'appTitle',
  descriptionKey: 'appDescription',
  icon: Compass,
  component: TravelWorkspace,
};
export default app;
