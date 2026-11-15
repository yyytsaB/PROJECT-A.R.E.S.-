import type { PlanetaryRoute } from '../core/types';
import type { useExpeditionJourney } from '../hooks/useMissionTelemetry';
import presentation from '../content/journeyPresentation.json';
import { ProgressRing, RouteArtwork } from './MissionVisuals';

interface Props { journey: ReturnType<typeof useExpeditionJourney>; routes: readonly PlanetaryRoute[]; missionDay: number; durationDays: number }
const badgeAssets: Readonly<Record<string, string>> = presentation.badgeAssets;

/** Schematic position along the drawn route: reached waypoints plus the fraction of the current leg. */
function routeProgressPoints(journey: Props['journey']) {
  const { startPosition: start, waypointPositions: pins } = presentation;
  const reached = journey.waypoints.filter(waypoint => waypoint.isUnlocked).length;
  const from = reached ? pins[reached - 1] : start, fromKm = reached ? journey.waypoints[reached - 1].distanceKm : 0;
  const next = journey.waypoints[reached], to = pins[reached];
  const fraction = next && to ? Math.max(0, Math.min(1, (journey.cumulativeDistanceKm - fromKm) / Math.max(1, next.distanceKm - fromKm))) : 0;
  const current = to ? { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction } : from;
  return { start, current, line: [start, ...pins.slice(0, reached), current] };
}

export function JourneySection({ journey, routes, missionDay, durationDays }: Props) {
  const progress = routeProgressPoints(journey);
  return <>
    <div className="page-heading"><div><h2 className="page-title" id="journey-heading">Expedition Journey</h2><p>Every logged kilometre and form-qualified rep advances your virtual expedition.</p></div><div className="mission-day-badge glass"><span>Mission Day</span><strong>{missionDay}<small>/ {durationDays}</small></strong></div></div>
    <div className="journey-summary"><section className="glass journey-stats"><div className="card-heading"><div><h3><span className="visually-hidden">Your Expedition</span><span aria-hidden="true">Leg {journey.currentLegNumber} of {journey.activeRoute.milestones.length} — {journey.activeRoute.name}</span></h3><p>Progress toward your next waypoint</p></div><span className="journey-leg-chip">{journey.nextWaypoint ? 'Current leg' : 'Route complete'}</span></div>
      <div className="journey-bars"><label>Distance traversed <span><output aria-label="Expedition distance">{journey.cumulativeDistanceKm.toFixed(2)} km</output> / {journey.activeRoute.totalDistanceKm.toLocaleString()} km</span><progress aria-label="Route progress" max={100} value={journey.progressPct} /></label>
      <label>ARED equivalent distance <span>{journey.resistanceEquivalentKm.toFixed(2)} km</span><progress aria-label="ARED route contribution" max={journey.activeRoute.totalDistanceKm} value={journey.resistanceEquivalentKm} /></label>
      <label>Cardio distance <span>{journey.cardioKm.toFixed(2)} km</span><progress aria-label="Cardio route contribution" max={journey.activeRoute.totalDistanceKm} value={journey.cardioKm} /></label></div>
      <dl className="journey-totals"><div><dt>ARED volume lifted</dt><dd>{(journey.totalTonnageKg / 1000).toFixed(1)} <small>t</small></dd></div><div><dt>Sessions logged</dt><dd>{journey.sessionCount}</dd></div></dl>
    </section><section className="glass journey-ring"><h3 className="visually-hidden">Route Completion</h3><ProgressRing value={journey.progressPct}><strong>{Math.round(journey.progressPct)}%</strong><span>reached</span></ProgressRing><div><p className="destination-kicker">Target destination</p><h3>{journey.activeRoute.name}</h3><p>{journey.remainingDistanceKm.toFixed(2)} km remaining</p><p className="prototype-note">Virtual game expedition</p></div></section></div>
    <section className="glass journey-map-card" aria-labelledby="planetary-map-heading"><header className="journey-map-heading"><div><h3 id="planetary-map-heading">Planetary route</h3><p>Select a waypoint to view details</p></div><div className="route-picker"><label htmlFor="active-route">Active route</label><select id="active-route" value={journey.activeRoute.id} onChange={event => journey.selectRoute(event.target.value as PlanetaryRoute['id'])}>{routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}</select></div></header>
      <figure className="route-illustration"><div className="journey-route-canvas"><RouteArtwork activeRoute={journey.activeRoute} routes={routes} /><svg className="route-completed-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><polyline points={progress.line.map(point => `${point.x},${point.y}`).join(' ')} /></svg>
      <span className="route-start-marker" style={{ left: `${progress.start.x}%`, top: `${progress.start.y}%` }} aria-hidden="true"><small>Start · 0 km</small></span>
      {journey.nextWaypoint && <span className="route-current-marker" style={{ left: `${progress.current.x}%`, top: `${progress.current.y}%` }} aria-hidden="true"><small>You are here · {Math.round(journey.cumulativeDistanceKm).toLocaleString()} km</small></span>}
      {journey.waypoints.map((waypoint, index) => { const position = presentation.waypointPositions[index]; return <button key={waypoint.id} className="waypoint-pin" data-unlocked={waypoint.isUnlocked} style={{ left: `${position.x}%`, top: `${position.y}%` }} aria-label={`${waypoint.name}, ${waypoint.distanceKm} km, ${waypoint.isUnlocked ? 'Unlocked' : 'Locked'}`} aria-pressed={journey.selectedWaypoint?.id === waypoint.id} onClick={() => journey.selectWaypoint(waypoint.id)}><span><img src={`/assets/icons/${index === journey.waypoints.length - 1 ? 'trophy' : 'map-pin'}.svg`} alt="Virtual waypoint marker" aria-hidden="true" width="20" height="20" /></span><small>{waypoint.name}</small></button>; })}
      </div>{journey.selectedWaypoint && <section className="waypoint-details" aria-label="Waypoint details"><div><h4>{journey.selectedWaypoint.name}</h4><span>{journey.selectedWaypoint.distanceKm.toLocaleString()} km</span></div><p>{journey.selectedWaypoint.description}</p><small>{journey.selectedWaypoint.isUnlocked ? 'Unlocked milestone' : journey.selectedWaypoint.id === journey.nextWaypoint?.id ? 'Next waypoint · locked until reached' : 'Locked milestone'}</small></section>}
      <figcaption>{journey.activeRoute.name} · {journey.activeRoute.totalDistanceKm.toLocaleString()} km game expedition · Schematic illustration, not terrain-derived or to scale. Bars show contributions toward the same route distance; 250 kg of form-qualified ARED volume equals 1 virtual km.</figcaption></figure>
    </section>
    <section className="glass badge-panel" aria-labelledby="badges-heading"><header className="badges-heading"><div><h3 id="badges-heading"><img src="/assets/icons/award.svg" alt="Milestone award icon" aria-hidden="true" width="24" height="24" />Crew Milestone Badges</h3><p>{journey.unlockedBadges.length} of {journey.activeRoute.milestones.length} earned</p></div><button aria-label="View all badges" aria-pressed={journey.showAllBadges} onClick={() => journey.setShowAllBadges(!journey.showAllBadges)}>View all badges <span aria-hidden="true">→</span></button></header>
      <ul className="mission-badges" aria-label="Mission badges">{journey.badges.map(badge => <li key={badge.id} data-unlocked={badge.isUnlocked}><img src={badgeAssets[badge.id] ?? '/assets/mission-badge.svg'} alt={`${badge.name} mission badge illustration`} width="64" height="64" /><div><p className="badge-title"><strong>{badge.name}</strong> · {badge.isUnlocked ? 'Unlocked' : 'Locked'}</p><p>{badge.description}</p><small>{badge.distanceKm.toLocaleString()} km milestone</small></div></li>)}</ul>
      {!journey.badges.length && <p>No milestones unlocked yet. View all badges to see the route goals.</p>}
      <p className="next-waypoint-note">Next waypoint: <strong>{journey.nextWaypoint ? `${journey.nextWaypoint.name} at ${journey.nextWaypoint.distanceKm} km` : 'Route complete'}</strong></p>
    </section>
  </>;
}
