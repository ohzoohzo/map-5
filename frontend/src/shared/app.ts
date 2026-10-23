import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface AppDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  component: ComponentType;
}
