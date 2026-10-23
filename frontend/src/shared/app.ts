import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * 기능(미니 앱) 등록 정보. `src/apps/<기능>/app.config.tsx` 에서 default export 하면
 * App.tsx 가 자동으로 라우트·메뉴에 붙인다. App.tsx 를 직접 고칠 필요가 없다.
 */
export interface AppDefinition {
  id: string;
  /** URL 경로. 예: '/weather' (홈은 '/') */
  path: string;
  /** 상단 메뉴 순서 (작을수록 왼쪽). 메뉴에 없는 화면은 nav: false */
  order: number;
  nav?: boolean;
  /** 메뉴 이름 i18n 키 ('<namespace>:<key>' 형식 가능) */
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  component: ComponentType;
}
