import { Global } from '@emotion/react';
import { ArrowUpRight, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppDefinition } from './shared/app';
import { Link, usePathname } from './shared/router';
import { globalStyles, Shell } from './styles';
import SourceFooter from './apps/sources/SourceFooter';

// 기능 등록은 apps/<기능>/app.config.tsx 로만 한다. 이 파일은 공통 영역(여원 리뷰).
const modules = import.meta.glob<{ default: AppDefinition }>('./apps/*/app.config.tsx', { eager: true });
const apps = Object.values(modules).map((module) => module.default).sort((a, b) => a.order - b.order);

export default function App() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const activeApp = apps.find((app) => app.path === pathname) ?? apps.find((app) => app.path === '/');
  const ActiveComponent = activeApp?.component;
  const navGroups = [
    { app: apps.find((app) => app.id === 'home'), titleKey: 'navHome', activePaths: ['/'] },
    { app: apps.find((app) => app.id === 'explore'), titleKey: 'navPlanning', activePaths: ['/explore', '/schedule'] },
    { app: apps.find((app) => app.id === 'weather'), titleKey: 'navBeforeTravel', activePaths: ['/weather', '/transport'], icon: ShieldCheck },
    { app: apps.find((app) => app.id === 'docent'), titleKey: 'navDocent', activePaths: ['/docent'] },
  ].filter((item): item is { app: AppDefinition; titleKey: string; activePaths: string[]; icon?: LucideIcon } => item.app !== undefined);

  return (
    <Shell>
      <Global styles={globalStyles} />
      <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label={t('brand')}>
            <img className="brand-mark" src="/brand/pinday-logo.png" alt="" width={38} height={38} />
            <span aria-hidden="true">{t('brand')}<span className="brand-dot">.</span></span>
          </Link>
          <nav className="main-nav" aria-label={t('appTitle')}>
            {navGroups.map(({ app, titleKey, activePaths, icon }) => {
              const active = activePaths.includes(pathname);
              const Icon = icon ?? app.icon;
              return (
                <Link key={app.id} href={app.path} className={active ? 'nav-item active' : 'nav-item'} aria-current={active ? 'page' : undefined}>
                  <Icon size={16} />{t(titleKey)}
                </Link>
              );
            })}
          </nav>
          <span className="header-note">{t('headerNote')}<ArrowUpRight size={15} /></span>
        </div>
      </header>
      <main id="main-content">{ActiveComponent && <ActiveComponent />}</main>
      <SourceFooter />
    </Shell>
  );
}
