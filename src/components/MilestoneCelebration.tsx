import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AnimationEvent, CSSProperties } from 'react';
import type { useMilestoneCelebrations } from '../hooks/useMissionTelemetry';
import journeyPresentation from '../content/journeyPresentation.json';

const FALLBACK_BADGE = '/assets/mission-badge.svg';
/** Upper bound if CSS animations never run (disabled engine, throttled tab), so a celebration cannot linger as a stuck layer. */
const SAFETY_TIMEOUT_MS = 7000;
/** Sparkle placement around the coin (percent of the stage) and start delay within the slow-motion hold. */
const SPARKLES = [
  { x: 14, y: 22, delay: 1300, size: 18 }, { x: 86, y: 18, delay: 1550, size: 14 }, { x: 92, y: 62, delay: 1900, size: 20 },
  { x: 10, y: 70, delay: 2150, size: 14 }, { x: 70, y: 90, delay: 2450, size: 12 }, { x: 30, y: 6, delay: 2700, size: 12 },
] as const;

type Celebrations = ReturnType<typeof useMilestoneCelebrations>;

/**
 * Full-screen, container-free milestone moment: the badge spins up into view as a growing coin, holds in slow motion with a
 * shine and glow, then flips away as it shrinks. Presentation only; earning is decided by the telemetry hook.
 * It never steals focus and only the dismiss button takes pointer input.
 */
export function MilestoneCelebration({ celebrations }: { celebrations: Celebrations }) {
  const { current, dismiss } = celebrations;
  const [announcement, setAnnouncement] = useState('');
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // Warm the small badge SVGs once so a milestone earned after going offline still shows its artwork.
  useEffect(() => { for (const url of [...Object.values(journeyPresentation.badgeAssets), FALLBACK_BADGE, '/assets/ares-mark.svg']) { const image = new Image(); image.src = url; } }, []);
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
    {/* Portalled to <body> so the moment is centred on the real viewport, unaffected by the app shell's presentation scaling. */}
    {current && createPortal(<div className="milestone-celebration" key={current.key}>
      <div className="milestone-celebration-card" role="group" aria-label={`Milestone unlocked: ${current.name}`} data-milestone={current.milestoneId} onAnimationEnd={finish}>
        <span className="milestone-backdrop" aria-hidden="true" />
        <div className="milestone-coin-stage" aria-hidden="true">
          <span className="milestone-rays" />
          <span className="milestone-halo" />
          <div className="milestone-coin">
            <div className="milestone-coin-face">
              <img src={src} alt="" width="300" height="300" onError={() => setFailedSrc(current.badgeSrc)} />
              {/* The shine is masked by the badge art itself, so the light only ever crosses the medal. */}
              <span className="milestone-shine" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` } as CSSProperties} />
            </div>
            <span className="milestone-coin-back" />
          </div>
          {SPARKLES.map((sparkle, index) => <span key={index} className="milestone-sparkle"
            style={{ left: `${sparkle.x}%`, top: `${sparkle.y}%`, width: sparkle.size, height: sparkle.size, animationDelay: `${sparkle.delay}ms` }} />)}
        </div>
        <div className="milestone-celebration-copy">
          <p className="milestone-kicker">Milestone unlocked</p>
          <h2>{current.name}</h2>
          <p className="milestone-route">{current.routeName} · {current.distanceKm.toLocaleString()} km</p>
          <p className="milestone-detail">{current.description}</p>
        </div>
        <button type="button" className="milestone-dismiss" aria-label="Dismiss milestone celebration" onClick={() => dismiss(current.key)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M6 18 18 6" /></svg>
          <span aria-hidden="true">Dismiss</span>
        </button>
      </div>
    </div>, document.body)}
  </>;
}
