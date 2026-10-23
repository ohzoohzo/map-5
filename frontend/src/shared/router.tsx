import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/** 의존성 없는 최소 라우터: pathname 구독 + 링크. 쿼리스트링은 화면 간 문맥 전달에 쓴다 (?place=...&day=1). */
function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function useSearchParam(name: string) {
  return useSyncExternalStore(subscribe, () => new URLSearchParams(window.location.search).get(name));
}

export function navigate(to: string) {
  if (to === window.location.pathname + window.location.search) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  function handle(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    navigate(href);
  }
  return <a href={href} onClick={handle} {...rest} />;
}
