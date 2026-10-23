import { Global } from '@emotion/react';
import { MapPinned, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppDefinition } from './shared/app';
import { Link, usePathname } from './shared/router';
import { globalStyles, Shell } from './styles';

// 기능 등록은 apps/<기능>/app.config.tsx 로만 한다. 이 파일은 공통 영역(여원 리뷰).
const modules = import.meta.glob<{ default: AppDefinition }>('./apps/*/app.config.tsx', { eager: true });
const apps = Object.values(modules).map((module) => module.default).sort((a, b) => a.order - b.order);

export default function App() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const activeApp = apps.find((app) => app.path === pathname) ?? apps.find((app) => app.path === '/');
  const ActiveComponent = activeApp?.component;

  return (
    <Shell>
      <Global styles={globalStyles} />
      <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label={t('brand')}>
            <span className="brand-mark"><MapPinned size={23} strokeWidth={1.8} /></span>
            <span>{t('brand')}<span className="brand-dot">.</span></span>
          </Link>
          <nav className="main-nav" aria-label={t('appTitle')}>
            {apps.filter((app) => app.nav !== false).map((app) => (
              <Link key={app.id} href={app.path} className={app === activeApp ? 'nav-item active' : 'nav-item'} aria-current={app === activeApp ? 'page' : undefined}>
                <app.icon size={16} />{t(app.titleKey)}
              </Link>
            ))}
          </nav>
          <span className="header-note">{t('headerNote')}<ArrowUpRight size={15} /></span>
        </div>
      </header>
      <main id="main-content">{ActiveComponent && <ActiveComponent />}</main>
    </Shell>
  );
}
