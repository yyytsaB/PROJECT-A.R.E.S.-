import { useEffect, useRef, useState } from 'react';
import type { useDashboardSummary } from '../hooks/useMissionTelemetry';
import { RoutinePrescription } from '../OnboardingSection';
import weeklyTemplate from '../content/weeklyTemplate.json';

function ReferenceIcon({ name }: { name: 'calendar-days' | 'sparkles' | 'dumbbell' | 'footprints' | 'bike' | 'waves' | 'info' }) {
  return <img className="reference-icon" src={`/assets/icons/${name}.svg`} alt={`${name.replace('-', ' ')} icon`} aria-hidden="true" width="20" height="20" />;
}

/** Presentation only: completion, prescriptions and launch actions come from the dashboard hook. */
export function DashboardSchedule({ dashboard }: { dashboard: ReturnType<typeof useDashboardSummary> }) {
  const weekDialog = useRef<HTMLDialogElement>(null);
  const [weekOpen, setWeekOpen] = useState(false);
  useEffect(() => { if (weekOpen) weekDialog.current?.showModal(); }, [weekOpen]);
  return <div className="schedule-card glass">
    <div className="schedule-heading"><div><h3><span className="visually-hidden">Today’s exercise schedule</span><span aria-hidden="true">Today's Schedule</span></h3>
      <p className="visually-hidden" aria-label="Personalized routine label">{dashboard.personalizedRoutine.summaryLabel}</p>
      <div className="schedule-meta"><span className="adapted-pill" aria-hidden="true"><ReferenceIcon name="sparkles" />Adapted to your progress</span><span>{dashboard.completedExerciseCount} of {dashboard.todaySchedule.length} complete</span></div>
    </div><button className="view-week" onClick={() => setWeekOpen(true)}><ReferenceIcon name="calendar-days" />View week</button></div>
    <ul className="daily-schedule" aria-label="Personalized daily schedule">{dashboard.todaySchedule.map(exercise => <li key={exercise.id} data-completed={exercise.completed}>
      <label><input type="checkbox" aria-label={`Mark ${exercise.name} complete`} checked={exercise.completed} onChange={event => dashboard.setScheduleCompletion(exercise.id, event.target.checked)} /><span className="visually-hidden">{exercise.name}</span></label>
      <span className="exercise-icon" aria-hidden="true">{exercise.kind === 'RESISTANCE' ? <ReferenceIcon name="dumbbell" /> : exercise.id === 'TREADMILL' ? <ReferenceIcon name="footprints" /> : exercise.id === 'CYCLE_ERGOMETER' ? <ReferenceIcon name="bike" /> : <ReferenceIcon name="waves" />}</span>
      <div className="schedule-copy">{exercise.kind === 'RESISTANCE' ? <button className="exercise-quick-launch" aria-label={`Quick launch ${exercise.name}`} onClick={() => dashboard.quickLaunchExercise?.(exercise.id)}><span>{exercise.name}</span>{exercise.prescription && <small><RoutinePrescription item={exercise.prescription} /></small>}</button> : <strong>{exercise.name}</strong>}
        {exercise.kind !== 'RESISTANCE' && exercise.prescription && <p><RoutinePrescription item={exercise.prescription} /></p>}
      </div>
      <time dateTime={exercise.scheduledTime}>{exercise.scheduledTime}</time>
      {exercise.prescription && <details className="routine-rationale"><summary><span className="visually-hidden">Why this exercise</span><ReferenceIcon name="info" /></summary><p>{exercise.prescription.rationale}</p></details>}
    </li>)}</ul>
    <p className="prototype-note schedule-caption">Sample schedule for the UTC mission day; times are demo settings.</p>
    {weekOpen && <dialog onClose={() => setWeekOpen(false)} ref={weekDialog} className="week-dialog" aria-labelledby="week-heading" aria-describedby="week-notice"><h3 id="week-heading">This week's microcycle</h3><p id="week-notice">Illustrative weekly template. Not a personalized weekly prescription.</p><ul aria-label="Weekly training microcycle">{weeklyTemplate.map(day => <li key={day.day}><strong>{day.day}</strong><span>{day.focus}</span><small data-load={day.load}>{day.load}</small></li>)}</ul><button onClick={() => weekDialog.current?.close()}>Close week</button></dialog>}
  </div>;
}
