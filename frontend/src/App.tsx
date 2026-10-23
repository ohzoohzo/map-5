import { Global } from '@emotion/react';
import { MapPinned, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppDefinition } from './shared/app';
import { globalStyles, Shell } from './styles';

const modules = import.meta.glob<{ default: AppDefinition }>('./apps/*/app.config.tsx', { eager: true });
const apps = Object.values(modules).map((module) => module.default).sort((a, b) => a.id.localeCompare(b.id));

export default function App() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(apps[0]?.id ?? '');
  const activeApp = apps.find((app) => app.id === activeId);
  const ActiveComponent = activeApp?.component;

  return (
    <Shell>
      <Global styles={globalStyles} />
      <a className="skip-link" href="#main-content">{t('skipToContent')}</a>
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand" aria-label={t('brand')}>
            <span className="brand-mark"><MapPinned size={23} strokeWidth={1.8} /></span>
            <span>{t('brand')}<span className="brand-dot">.</span></span>
          </a>
          <nav className="main-nav" aria-label={t('appTitle')}>
            {apps.map((app) => (
              <button key={app.id} className={app.id === activeId ? 'nav-item active' : 'nav-item'} onClick={() => setActiveId(app.id)} aria-current={app.id === activeId ? 'page' : undefined}>
                <app.icon size={16} />{t(app.titleKey)}
              </button>
            ))}
          </nav>
          <span className="header-note">{t('headerNote')}<ArrowUpRight size={15} /></span>
        </div>
      </header>
      <main id="main-content">{ActiveComponent && <ActiveComponent />}</main>
    </Shell>
  );
}
