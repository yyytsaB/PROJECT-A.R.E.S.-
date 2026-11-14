import { useEffect, useState } from 'react';

const pages = [
  { id: 'dashboard', label: 'Dashboard', headingId: 'command-heading' },
  { id: 'arena', label: 'Workout Arena', headingId: 'arena-heading' },
  { id: 'journey', label: 'Journey', headingId: 'journey-heading' },
  { id: 'analytics', label: 'Analytics', headingId: 'medical-heading' },
  { id: 'logs', label: 'Logs', headingId: 'history-heading' },
  { id: 'settings', label: 'Settings', headingId: 'settings-heading' },
  { id: 'onboarding', label: 'Onboarding', headingId: 'onboarding-heading' },
] as const;

export function useAppNavigation() {
  const pageFromHash = () => typeof window === 'undefined' ? undefined : window.location.hash === '' ? 'dashboard' : pages.find(page => window.location.hash === `#${page.headingId}`)?.id;
  const [activePage, setActivePage] = useState<(typeof pages)[number]['id']>(() => pageFromHash() ?? 'dashboard');
  useEffect(() => {
    const update = () => { const page = pageFromHash(); if (page) setActivePage(page); };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { document.title = `${pages.find(page => page.id === activePage)!.label} — A.R.E.S.`; }, [activePage]);
  return { pages, activePage, setActivePage };
}
