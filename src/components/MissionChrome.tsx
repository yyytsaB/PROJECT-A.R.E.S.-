import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import type { useAppNavigation } from '../hooks/useAppNavigation';
import { MissionIcon } from './MissionVisuals';

interface Props {
  navigation: ReturnType<typeof useAppNavigation>; name: string; pendingCount: number;
  commsOpen: boolean; notification: string; children: ReactNode;
}

export function MissionChrome({ navigation, name, pendingCount, commsOpen, notification, children }: Props) {
  const [presentationScale, setPresentationScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => setPresentationScale(Math.max(1, document.documentElement.clientWidth / 1440));
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const drawer = useRef<HTMLDialogElement>(null), notices = useRef<HTMLDialogElement>(null), search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false), [selected, setSelected] = useState(0);
  const results = navigation.pages.filter(page => page.label.toLowerCase().includes(query.toLowerCase()));
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const go = (id: typeof navigation.activePage) => { drawer.current?.close(); setSearchOpen(false); setQuery(''); navigation.navigateToPage(id); };
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search.current?.focus(); setSearchOpen(true); } };
    window.addEventListener('keydown', shortcut); return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const containDrawerFocus = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], select')].filter(element => element.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const brand = <><img src="/assets/ares-mark.svg" alt="ARES mission emblem" width="56" height="56" /><span><strong>ARES</strong><small>Resistance &amp; Exercise</small></span></>;
  const navigationList = <nav aria-label="Mission sections"><p className="nav-caption">Mission control</p><ul>{navigation.pages.map((page, index) => <li key={page.id} className={index > 5 ? 'secondary-nav-item' : undefined}>
    <a href={`#/${page.id}`} aria-label={page.label} aria-current={navigation.activePage === page.id ? 'page' : undefined} onClick={event => { event.preventDefault(); go(page.id); }}><MissionIcon name={page.id} /><span>{page.id === 'arena' ? 'Arena' : page.label}</span></a>
  </li>)}</ul></nav>;
  const crew = <button className="crew-profile" onClick={() => go('profile')} aria-label={`View profile for ${name}`}><span className="crew-avatar" aria-hidden="true">{initials}</span><span><strong>{name}</strong><small><span className="system-dot" />On mission · local</small></span><MissionIcon name="chevron" /></button>;
  return <>
    <div className="mission-ambient" aria-hidden="true"><div><img src="/assets/mission-ambient.png" alt="Decorative mission light overlay" /><img src="/assets/mission-ambient.png" alt="Decorative mission light overlay" /></div></div>
    <div className="mission-shell" data-route={navigation.activePage} style={{ '--presentation-scale': presentationScale } as CSSProperties}>
    <aside className="mission-sidebar"><a href="#/dashboard" className="mission-brand" onClick={event => { event.preventDefault(); go('dashboard'); }}>{brand}</a>{navigationList}<div className="sidebar-footer">{crew}</div></aside>
    <div className="mission-workspace">
      <header className="mission-topbar">
        <button className="mobile-menu-button icon-button" aria-label="Open navigation menu" onClick={() => drawer.current?.showModal()}><MissionIcon name="menu" /></button>
        <a className="mobile-brand" href="#/dashboard" onClick={event => { event.preventDefault(); go('dashboard'); }}>{brand}</a>
        <div className="mission-search"><MissionIcon name="search" /><input ref={search} id="global-search" role="combobox" aria-label="Search pages and actions" aria-autocomplete="list" aria-expanded={searchOpen} aria-controls="mission-search-results" aria-activedescendant={searchOpen && results[selected] ? `search-result-${results[selected].id}` : undefined} autoComplete="off" placeholder="Search exercises, logs, settings…" value={query} onFocus={() => setSearchOpen(true)} onBlur={() => setSearchOpen(false)} onChange={event => { setQuery(event.target.value); setSelected(0); }} onKeyDown={event => {
          if (event.key === 'Escape') setSearchOpen(false);
          if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(index => Math.min(index + 1, results.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(index => Math.max(0, index - 1)); }
          if (event.key === 'Enter' && results[selected]) { event.preventDefault(); go(results[selected].id); }
        }} /><kbd>⌘K</kbd>
          {searchOpen && <ul id="mission-search-results" role="listbox" aria-label="Mission search results">{results.length ? results.map((page, index) => <li key={page.id} id={`search-result-${page.id}`} role="option" aria-selected={selected === index}><button tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => go(page.id)}><MissionIcon name={page.id} />{page.label}</button></li>) : <li>No matching pages</li>}</ul>}
        </div>
        <div className="topbar-actions"><span className="connection-chip" data-open={commsOpen}><span className="system-dot" />{commsOpen ? 'Comms window open' : 'Comms blackout scenario'}</span>
          <button className="icon-button queue-shortcut" aria-label={`Open sync settings, ${pendingCount} summaries pending`} onClick={() => go('settings')}><MissionIcon name="sync" />{pendingCount > 0 && <span className="toolbar-count">{pendingCount}</span>}</button>
          <button className="icon-button" aria-label="Mission notifications" onClick={() => notices.current?.showModal()}><MissionIcon name="bell" />{notification && <span className="notification-dot" />}</button>
          <a className="topbar-start" aria-label="Start session" href="#/arena" onClick={event => { event.preventDefault(); go('arena'); }}><MissionIcon name="play" /><span>Start session</span></a>
        </div>
      </header>
      {children}
    </div>
    <dialog ref={drawer} className="navigation-drawer" aria-label="Navigation menu" onKeyDown={containDrawerFocus}><button className="icon-button drawer-close" aria-label="Close navigation menu" autoFocus onClick={() => drawer.current?.close()}><MissionIcon name="close" /></button><a className="mission-brand" href="#/dashboard" onClick={event => { event.preventDefault(); go('dashboard'); }}>{brand}</a><label className="drawer-jump">Quick navigation<select aria-label="Jump to mission section" value={navigation.activePage} onChange={event => { const page = navigation.pages.find(item => item.id === event.target.value); if (page) go(page.id); }}>{navigation.pages.map(page => <option key={page.id} value={page.id}>{page.label}</option>)}</select></label>{navigationList}<div className="sidebar-footer">{crew}</div></dialog>
    <dialog ref={notices} aria-labelledby="notifications-heading"><h2 id="notifications-heading">Mission notifications</h2><p>{notification || 'No new mission notifications.'}</p><button onClick={() => notices.current?.close()}>Close notifications</button></dialog>
  </div></>;
}
