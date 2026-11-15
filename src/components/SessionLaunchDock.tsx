import { useLayoutEffect, useRef, useState } from 'react';

interface Placement { pinned: boolean; left: number; width: number; height: number }
interface Props { active: boolean; disabled: boolean; onLaunch(): void }

/** Pin the launch action only until its reserved position beneath the Ready card enters view. */
export function SessionLaunchDock({ active, disabled, onLaunch }: Props) {
  const home = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const previous = useRef<Placement | null>(null);
  useLayoutEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!home.current || !button.current) return;
      const rect = home.current.getBoundingClientRect(), height = button.current.getBoundingClientRect().height;
      const scale = rect.width / home.current.offsetWidth;
      const inset = (Number.parseFloat(getComputedStyle(home.current).scrollMarginBottom) || 24) * scale;
      const next = { pinned: rect.top + height > window.innerHeight - inset, left: rect.left / scale, width: rect.width / scale, height: height / scale };
      const last = previous.current;
      if (!last || Object.entries(next).some(([key, value]) => last[key as keyof Placement] !== value)) {
        previous.current = next; setPlacement(next);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(home.current!); observer.observe(button.current!);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [active]);
  return <div ref={home} className="session-launch-home" style={{ height: placement?.height }}>
    <button ref={button} className="primary-action session-launch glass-strong" aria-label="INITIATE TODAY'S SESSION" disabled={disabled} onClick={onLaunch}
      style={placement?.pinned ? { position: 'fixed', left: placement.left, width: placement.width, bottom: 'var(--launch-dock-inset)' } : undefined}>
      <span><strong>INITIATE TODAY'S <br />SESSION</strong><small aria-hidden="true">Opens the AI Workout Arena</small></span><span className="launch-arrow" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></span>
    </button>
  </div>;
}
