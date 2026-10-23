import styled from '@emotion/styled';
import { useTranslation } from 'react-i18next';
import { color, layout, radius } from '../../shared/design/tokens';
import { Link } from '../../shared/router';

const Footer = styled.footer`
  margin-top: 24px;
  border-top: 1px solid ${color.border};
  color: ${color.textSub};
  .footer-inner { display: flex; align-items: center; justify-content: flex-end; max-width: ${layout.maxWidth}; margin: auto; padding: 16px 32px; }
  a { display: inline-flex; align-items: center; min-height: ${layout.minTouch}; padding: 0 8px; font-size: 12px; }
  a:hover { color: ${color.primary}; text-decoration: underline; text-underline-offset: 3px; }
  a:focus-visible { outline: 2px solid ${color.primary}; outline-offset: 2px; border-radius: ${radius.sm}; }
  @media (max-width: 720px) { .footer-inner { padding: 12px 16px; } }
`;

export default function SourceFooter() {
  const { t } = useTranslation('sources');
  return <Footer><div className="footer-inner"><Link href="/sources">{t('title')}</Link></div></Footer>;
}
