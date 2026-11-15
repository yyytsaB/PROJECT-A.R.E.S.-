import type { ReactNode } from 'react';
import type { PlanetaryRoute, PlanetaryRouteId } from '../core/types';

const routeArtwork: Record<PlanetaryRouteId, string> = { VALLES_MARINERIS: '/assets/valles-marineris-route.svg', OLYMPUS_MONS: '/assets/olympus-mons-route.svg' };

/** Mount both small schematics eagerly so route switching needs no new request after disconnecting. */
export function RouteArtwork({ activeRoute, routes, preview = false }: { activeRoute: PlanetaryRoute; routes: readonly PlanetaryRoute[]; preview?: boolean }) {
  return <div className="route-map"><img className="route-texture" src="/assets/mars-surface.jpg" alt="Red rock texture from the mission mockup; decorative illustration, not Mars terrain data" width="1600" height="1600" />{routes.map(route => <img className="route-schematic" key={route.id} src={routeArtwork[route.id]} alt={`${route.name} virtual ${preview ? 'expedition schematic, not to scale' : 'game route illustration, not terrain-derived or to scale'}`} width="900" height="360" hidden={route.id !== activeRoute.id} />)}</div>;
}

const iconPaths: Record<string, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  arena: 'M3 8v8m3-10v12m0-6h12m0-6v12m3-10v8',
  journey: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',
  analytics: 'M3 12h4l3-8 4 16 3-8h4',
  logs: 'M6 3h12v18H6zM9 7h6m-6 5h6m-6 5h4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  onboarding: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a6 6 0 0 1 6-5h4a6 6 0 0 1 6 5v3',
  sync: 'M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5',
  camera: 'M8 5l2-2h4l2 2h5v15H3V5Zm8 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z',
  storage: 'M4 6c0-4 16-4 16 0s-16 4-16 0Zm0 0v6c0 4 16 4 16 0V6M4 12v6c0 4 16 4 16 0v-6',
  play: 'm8 4 12 8-12 8Z',
  search: 'M20 20l-5-5m2-6a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  chevron: 'm8 10 4 4 4-4',
  profile: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a6 6 0 0 1 6-5h4a6 6 0 0 1 6 5v3',
  sources: 'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3ZM12 6v16',
};

/** Native navigation geometry measured in the team's rendered reference. */
const referenceIconShapes: Readonly<Record<string, ReactNode>> = {
  dashboard: <><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>,
  arena: <><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" /></>,
  journey: <><path d="M9 5h8.5a1 1 0 010 7h-11a1 1 0 000 7H15" /><circle cx="18" cy="19" r="3" /><circle cx="6" cy="5" r="3" /></>,
  analytics: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7" /></>,
  logs: <><path d="M15 12h-5" /><path d="M15 8h-5" /><path d="M19 17V5a2 2 0 0 0-2-2H4" /><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" /></>,
  settings: <><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></>,
};

export function MissionIcon({ name }: { name: string }) {
  return <svg className="mission-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={referenceIconShapes[name] ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{referenceIconShapes[name] ?? <path d={iconPaths[name] ?? iconPaths.dashboard} />}</svg>;
}

export function ProgressRing({ value, children }: { value: number; children: ReactNode }) {
  const fraction = Math.max(0, Math.min(100, value)) / 100;
  return <div className="progress-ring">
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false"><circle className="ring-track" cx="80" cy="80" r="67" /><circle className="ring-value" cx="80" cy="80" r="67" pathLength="100" strokeDasharray={`${fraction * 100} 100`} /></svg>
    <div className="ring-content">{children}</div>
  </div>;
}

export function TelemetryChart({ values, kind }: { values: readonly number[]; kind: 'retention' | 'volume' }) {
  const max = Math.max(kind === 'retention' ? 100 : 1, ...values);
  const points = values.map((value, index) => `${16 + index / Math.max(1, values.length - 1) * 608},${156 - value / max * 128}`).join(' ');
  return <svg className={`telemetry-chart ${kind}`} viewBox="0 0 640 190" aria-hidden="true" focusable="false">
    {[28, 70, 112, 156].map(y => <line key={y} x1="16" x2="624" y1={y} y2={y} className="chart-gridline" />)}
    {kind === 'retention' ? <><polygon points={`16,156 ${points} 624,156`} className="chart-area" /><polyline points={points} className="chart-line" /></> : values.map((value, index) => <rect key={index} x={16 + index * 608 / Math.max(1, values.length)} y={156 - value / max * 128} width={Math.max(1, 608 / Math.max(1, values.length) - 6)} height={value / max * 128} rx="2" className="chart-bar" />)}
    <text x="16" y="182">EARLIER</text><text x="566" y="182">LATEST</text>
  </svg>;
}
