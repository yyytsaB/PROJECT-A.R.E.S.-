import { useEffect, useRef, useState } from 'react';

const pages = [
  { id: 'dashboard', label: 'Dashboard', headingId: 'command-heading' },
  { id: 'arena', label: 'Workout Arena', headingId: 'arena-heading' },
  { id: 'journey', label: 'Journey', headingId: 'journey-heading' },
  { id: 'analytics', label: 'Analytics', headingId: 'medical-heading' },
  { id: 'logs', label: 'Logs', headingId: 'history-heading' },
  { id: 'settings', label: 'Settings', headingId: 'settings-heading' },
  { id: 'onboarding', label: 'Onboarding', headingId: 'onboarding-heading' },
  { id: 'profile', label: 'Profile', headingId: 'profile-heading' },
  { id: 'sources', label: 'NASA Data Sources', headingId: 'science-sources-heading' },
] as const;

export function useAppNavigation() {
  const pageFromHash = () => typeof window === 'undefined' ? undefined : pages.find(page => window.location.hash === `#/${page.id}` || window.location.hash === `#${page.headingId}`)?.id ?? 'dashboard';
  const [activePage, setActivePage] = useState<(typeof pages)[number]['id']>(() => pageFromHash() ?? 'dashboard');
  const mounted = useRef(false);
  useEffect(() => {
    const update = () => { const page = pageFromHash(); if (page) setActivePage(page); };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    document.title = `${pages.find(page => page.id === activePage)!.label} — A.R.E.S.`;
    window.scrollTo(0, 0);
    if (mounted.current) document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
    mounted.current = true;
  }, [activePage]);
  function navigateToPage(id: (typeof pages)[number]['id']) {
    setActivePage(id);
    window.location.hash = `/${id}`;
  }
  return { pages, activePage, setActivePage, navigateToPage };
}
