import { useEffect, useState } from 'react';
import type { AnimationEvent } from 'react';
import type { useMilestoneCelebrations } from '../hooks/useMissionTelemetry';
import journeyPresentation from '../content/journeyPresentation.json';

const FALLBACK_BADGE = '/assets/mission-badge.svg';
/** Upper bound if CSS animations never run (disabled engine, throttled tab), so a celebration cannot linger as a stuck layer. */
const SAFETY_TIMEOUT_MS = 6000;

type Celebrations = ReturnType<typeof useMilestoneCelebrations>;

/**
 * Non-modal celebration for a newly earned milestone: coin-flip reveal, one halo burst, a readable hold, then fade-out.
 * Presentation only. Earning is decided by the telemetry hook; this never steals focus or blocks the page.
 */
export function MilestoneCelebration({ celebrations }: { celebrations: Celebrations }) {
  const { current, dismiss } = celebrations;
  const [announcement, setAnnouncement] = useState('');
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // Warm the small badge SVGs once so a milestone earned after going offline still shows its artwork.
  useEffect(() => { for (const url of [...Object.values(journeyPresentation.badgeAssets), FALLBACK_BADGE]) { const image = new Image(); image.src = url; } }, []);
  useEffect(() => {
    if (!current) return;
    setAnnouncement(`Milestone unlocked: ${current.name}. ${current.routeName}, ${current.distanceKm.toLocaleString()} km.`);
    const safety = setTimeout(() => dismiss(current.key), SAFETY_TIMEOUT_MS);
    return () => clearTimeout(safety);
  }, [current?.key]);
  const finish = (event: AnimationEvent<HTMLDivElement>) => {
    if (current && event.target === event.currentTarget && event.animationName.startsWith('milestone-celebration-life')) dismiss(current.key);
  };
  const src = current && failedSrc !== current.badgeSrc ? current.badgeSrc : FALLBACK_BADGE;
  return <>
    <p className="visually-hidden" aria-live="polite" aria-label="Milestone announcements">{announcement}</p>
    {current && <div className="milestone-celebration" key={current.key}>
      <div className="milestone-celebration-card" role="group" aria-label={`Milestone unlocked: ${current.name}`} data-milestone={current.milestoneId} onAnimationEnd={finish}>
        <div className="milestone-coin-stage" aria-hidden="true">
          <span className="milestone-halo" />
          <div className="milestone-coin">
            <img className="milestone-coin-face" src={src} alt="" width="128" height="128" onError={() => setFailedSrc(current.badgeSrc)} />
            <span className="milestone-coin-back" />
          </div>
        </div>
        <div className="milestone-celebration-copy">
          <p className="milestone-kicker">Milestone unlocked</p>
          <h2>{current.name}</h2>
          <p className="milestone-route">{current.routeName} · {current.distanceKm.toLocaleString()} km</p>
          <p className="milestone-detail">{current.description}</p>
        </div>
        <button type="button" className="milestone-dismiss" aria-label="Dismiss milestone celebration" onClick={() => dismiss(current.key)}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </div>
    </div>}
  </>;
}
