import type { ReactNode } from 'react';
import type { PlanetaryRoute, PlanetaryRouteId } from '../core/types';

const routeArtwork: Record<PlanetaryRouteId, string> = { VALLES_MARINERIS: '/assets/valles-marineris-route.svg', OLYMPUS_MONS: '/assets/olympus-mons-route.svg' };

/** Mount both small schematics eagerly so route switching needs no new request after disconnecting. */
export function RouteArtwork({ activeRoute, routes, preview = false }: { activeRoute: PlanetaryRoute; routes: readonly PlanetaryRoute[]; preview?: boolean }) {
  return <>{routes.map(route => <img key={route.id} src={routeArtwork[route.id]} alt={`${route.name} virtual ${preview ? 'expedition schematic, not to scale' : 'game route illustration, not terrain-derived or to scale'}`} width="900" height="360" hidden={route.id !== activeRoute.id} />)}</>;
}

const iconPaths: Record<string, string> = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  arena: 'M3 8v8m3-10v12m0-6h12m0-6v12m3-10v8',
  journey: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',
  analytics: 'M3 12h4l3-8 4 16 3-8h4',
  logs: 'M6 3h12v18H6zM9 7h6m-6 5h6m-6 5h4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  onboarding: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-3a6 6 0 0 1 6-5h4a6 6 0 0 1 6 5v3',
};

export function MissionIcon({ name }: { name: string }) {
  return <svg className="mission-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={iconPaths[name] ?? iconPaths.dashboard} /></svg>;
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
