import { useMissionOnboarding } from './hooks/useMissionOnboarding';
import { HealthMetricFields } from './HealthMetricFields';
import { loadMissionCatalog } from './core/catalog/missionCatalog';
import type { GravityProfileId, InjuryLimitation, MissionType, PersonalizedRoutineItem, ResistanceExerciseId } from './core/types';
import rules from './content/routineRules.json';

export function RoutinePrescription({ item }: { item: PersonalizedRoutineItem }) {
  return <span>{item.kind === 'RESISTANCE' ? `${item.targetSets}×${item.targetReps} @ ${item.recommendedLoadKg} kg` : `${item.targetCardioKm} km`}</span>;
}

export function OnboardingSection({ onSkip }: { onSkip?: () => void }) {
  const onboarding = useMissionOnboarding(), catalog = loadMissionCatalog();
  return <section className="mission-section onboarding-section" aria-labelledby="onboarding-heading">
    <div className="onboarding-layout"><aside className="onboarding-sidebar"><a href="#/dashboard" onClick={onSkip}><img src="/assets/ares-mark.svg" alt="ARES mission emblem" width="72" height="72" /><span><strong>PROJECT ARES</strong><small>Astronaut Resistance &amp; Exercise System</small></span></a><p className="eyebrow">YOUR MISSION STARTS HERE</p><h3>Built for the journey ahead.</h3><p>Personalize your exercise program for a new world.</p><ol>{['Body & health', 'Strength & limitations', 'Mission parameters'].map((label, index) => <li key={label} data-active={onboarding.step === index + 1} data-complete={onboarding.step > index + 1}><span>{index + 1}</span><div>{label}<small>{['Height, weight and pre-flight vitals', 'Earth 1RM baselines and injury history', 'Mission type, duration and gravity'][index]}</small></div></li>)}</ol><button onClick={onSkip}>Return to dashboard</button><small>SPACE APPS 2026 · TEAM PROTOTYPE</small></aside><div className="onboarding-content">
    <p className="eyebrow">Pre-space onboarding</p>
    <h2 className="page-title" id="onboarding-heading">Mission Onboarding — Set Up Your Profile</h2>
    <p>Rule-based prototype suggestions for review. Biometrics are recorded context; this flow provides no diagnosis or medical clearance.</p>
    <p className="onboarding-progress"><span><output aria-label="Onboarding progress">Step {onboarding.step} of 3</output><span aria-hidden="true">: {['Body & health', 'Strength & limitations', 'Mission parameters'][onboarding.step - 1]}</span></span><span aria-hidden="true">{Math.round(onboarding.step / 3 * 100)}%</span></p>
    <div className="step-track" aria-hidden="true">{[1, 2, 3].map(step => <span key={step} data-active={step <= onboarding.step} />)}</div>
    {!onboarding.preview && <>
      {onboarding.step === 1 && <fieldset><legend>Pre-Flight Biometrics &amp; Health Metrics</legend>
        <div className="onboarding-identity">
        <label htmlFor="onboarding-name">Onboarding astronaut name</label>{' '}<input id="onboarding-name" value={onboarding.fieldValue('name')} onChange={event => onboarding.setField('name', event.target.value)} aria-invalid={Boolean(onboarding.errors.name)} aria-describedby="onboarding-name-error" />
        <p id="onboarding-name-error" role={onboarding.errors.name ? 'alert' : undefined}>{onboarding.errors.name}</p>
        </div>
        <div className="health-metrics-grid"><HealthMetricFields prefix="onboarding" fieldValue={onboarding.fieldValue} setField={onboarding.setField} errors={onboarding.errors} bmi={onboarding.bmi} /></div>
      </fieldset>}
      {onboarding.step === 2 && <fieldset><legend>Earth 1RM Baselines &amp; Physical Limitations</legend>
        {catalog.exercises.filter(exercise => exercise.kind === 'RESISTANCE').map(exercise => <div key={exercise.id}>
          <label htmlFor={`onboarding-${exercise.id}`}>Onboarding {exercise.name} Earth baseline (kg)</label>{' '}
          <span className="unit-input" data-unit="kg"><input id={`onboarding-${exercise.id}`} type="number" min="0" step="any" value={onboarding.fieldValue(exercise.id)} onChange={event => onboarding.setField(exercise.id, event.target.value)} aria-invalid={Boolean(onboarding.errors[exercise.id])} aria-describedby={`onboarding-${exercise.id}-error`} /></span>
          <p id={`onboarding-${exercise.id}-error`} role={onboarding.errors[exercise.id] ? 'alert' : undefined}>{onboarding.errors[exercise.id as ResistanceExerciseId]}</p>
        </div>)}
        <label htmlFor="onboarding-injury-limitations">Onboarding injury or physical limitation</label>{' '}
        <select id="onboarding-injury-limitations" value={onboarding.profile.injuryLimitations} onChange={event => onboarding.setLimitation(event.target.value as InjuryLimitation)}>{Object.entries(rules.limitations).map(([id, rule]) => <option key={id} value={id}>{rule.label.charAt(0).toUpperCase() + rule.label.slice(1)}</option>)}</select>{' '}
        <label htmlFor="onboarding-injuryNotes">Onboarding limitation notes (optional)</label>{' '}<input id="onboarding-injuryNotes" value={onboarding.fieldValue('injuryNotes')} onChange={event => onboarding.setField('injuryNotes', event.target.value)} />
      </fieldset>}
      {onboarding.step === 3 && <fieldset><legend>Mission Parameters &amp; Routine Generation</legend>
        <label htmlFor="onboarding-mission-type">Onboarding mission type</label>{' '}<select id="onboarding-mission-type" value={onboarding.profile.missionType} onChange={event => onboarding.setMission(event.target.value as MissionType)}>{Object.entries(rules.missions).map(([id, mission]) => <option key={id} value={id}>{mission.label}</option>)}</select>{' '}
        <label htmlFor="onboarding-missionDurationDays">Onboarding mission duration (days)</label>{' '}<input id="onboarding-missionDurationDays" type="number" min="1" step="1" value={onboarding.fieldValue('missionDurationDays')} onChange={event => onboarding.setField('missionDurationDays', event.target.value)} aria-invalid={Boolean(onboarding.errors.missionDurationDays)} aria-describedby="onboarding-duration-error" />
        <p id="onboarding-duration-error" role={onboarding.errors.missionDurationDays ? 'alert' : undefined}>{onboarding.errors.missionDurationDays}</p>
        <label htmlFor="onboarding-gravity-profile">Onboarding gravity environment</label>{' '}<select id="onboarding-gravity-profile" value={onboarding.profile.gravityProfileId} onChange={event => onboarding.setGravity(event.target.value as GravityProfileId)}>{catalog.gravityProfiles.map(gravity => <option key={gravity.id} value={gravity.id}>{gravity.name} ({gravity.gravityG}g)</option>)}</select>
        <button disabled={onboarding.isBuilding} onClick={onboarding.generateRoutine}>Generate My Routine</button>
      </fieldset>}
    </>}
    <p aria-label="Onboarding processing" aria-live="polite">{onboarding.isBuilding ? 'ARES is building your personalized program…' : ''}</p>
    {onboarding.errorMessage && <p role="alert">{onboarding.errorMessage}</p>}
    {onboarding.preview && <section aria-label="Routine preview">
      <h3>Your personalized routine</h3><p>{onboarding.preview.summaryLabel}</p><p>{onboarding.preview.disclaimer}</p>
      <ol>{onboarding.preview.items.map(item => <li key={item.exerciseId}>{item.name} — <RoutinePrescription item={item} /><p>{item.rationale}</p></li>)}</ol>
      <button disabled={Boolean(onboarding.confirmation)} onClick={onboarding.confirmRoutine}>Confirm &amp; Apply Routine</button>
    </section>}
    <p className="onboarding-actions">{onboarding.step > 1 && <button className="back-action" onClick={onboarding.previousStep}>Previous step</button>}{' '}{onboarding.step < 3 && <button className="primary-action" onClick={onboarding.nextStep}>Next step</button>}</p>
    <p aria-label="Onboarding confirmation" role="status">{onboarding.confirmation}</p>
    </div></div>
  </section>;
}
