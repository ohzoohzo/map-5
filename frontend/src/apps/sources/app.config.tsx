import { BookOpen } from 'lucide-react';
import type { AppDefinition } from '../../shared/app';
import SourcesPage from './SourcesPage';

const app: AppDefinition = {
  id: 'sources',
  path: '/sources',
  order: 90,
  nav: false,
  titleKey: 'sources:title',
  descriptionKey: 'sources:subtitle',
  icon: BookOpen,
  component: SourcesPage,
};
export default app;
