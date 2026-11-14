import { useMissionOnboarding } from './hooks/useMissionOnboarding';
import { HealthMetricFields } from './HealthMetricFields';
import { loadMissionCatalog } from './core/catalog/missionCatalog';
import type { GravityProfileId, InjuryLimitation, MissionType, PersonalizedRoutineItem, ResistanceExerciseId } from './core/types';
import rules from './content/routineRules.json';

export function RoutinePrescription({ item }: { item: PersonalizedRoutineItem }) {
  return <span>{item.kind === 'RESISTANCE' ? `${item.targetSets}×${item.targetReps} @ ${item.recommendedLoadKg} kg` : `${item.targetCardioKm} km`}</span>;
}

export function OnboardingSection() {
  const onboarding = useMissionOnboarding(), catalog = loadMissionCatalog();
  return <section aria-labelledby="onboarding-heading">
    <h2 id="onboarding-heading">Mission Onboarding — Set Up Your Profile</h2>
    <p>Rule-based prototype suggestions for review. Biometrics are recorded context; this flow provides no diagnosis or medical clearance.</p>
    <p><output aria-label="Onboarding progress">Step {onboarding.step} of 3</output></p>
    {!onboarding.preview && <>
      {onboarding.step === 1 && <fieldset><legend>Pre-Flight Biometrics &amp; Health Metrics</legend>
        <label htmlFor="onboarding-name">Onboarding astronaut name</label>{' '}<input id="onboarding-name" value={onboarding.fieldValue('name')} onChange={event => onboarding.setField('name', event.target.value)} aria-invalid={Boolean(onboarding.errors.name)} aria-describedby="onboarding-name-error" />
        <p id="onboarding-name-error" role={onboarding.errors.name ? 'alert' : undefined}>{onboarding.errors.name}</p>
        <HealthMetricFields prefix="onboarding" fieldValue={onboarding.fieldValue} setField={onboarding.setField} errors={onboarding.errors} bmi={onboarding.bmi} />
      </fieldset>}
      {onboarding.step === 2 && <fieldset><legend>Earth 1RM Baselines &amp; Physical Limitations</legend>
        {catalog.exercises.filter(exercise => exercise.kind === 'RESISTANCE').map(exercise => <div key={exercise.id}>
          <label htmlFor={`onboarding-${exercise.id}`}>Onboarding {exercise.name} Earth baseline (kg)</label>{' '}
          <input id={`onboarding-${exercise.id}`} type="number" min="0" step="any" value={onboarding.fieldValue(exercise.id)} onChange={event => onboarding.setField(exercise.id, event.target.value)} aria-invalid={Boolean(onboarding.errors[exercise.id])} aria-describedby={`onboarding-${exercise.id}-error`} />
          <p id={`onboarding-${exercise.id}-error`} role={onboarding.errors[exercise.id] ? 'alert' : undefined}>{onboarding.errors[exercise.id as ResistanceExerciseId]}</p>
        </div>)}
        <label htmlFor="onboarding-injury-limitations">Onboarding injury or physical limitation</label>{' '}
        <select id="onboarding-injury-limitations" value={onboarding.profile.injuryLimitations} onChange={event => onboarding.setLimitation(event.target.value as InjuryLimitation)}>{Object.entries(rules.limitations).map(([id, rule]) => <option key={id} value={id}>{rule.label}</option>)}</select>{' '}
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
    <p aria-label="Onboarding processing" aria-live="polite">{onboarding.isBuilding ? 'A.R.E.S. is building your personalized program…' : ''}</p>
    {onboarding.errorMessage && <p role="alert">{onboarding.errorMessage}</p>}
    {onboarding.preview && <section aria-label="Routine preview">
      <h3>Your personalized routine</h3><p>{onboarding.preview.summaryLabel}</p><p>{onboarding.preview.disclaimer}</p>
      <ol>{onboarding.preview.items.map(item => <li key={item.exerciseId}>{item.name} — <RoutinePrescription item={item} /><p>{item.rationale}</p></li>)}</ol>
      <button disabled={Boolean(onboarding.confirmation)} onClick={onboarding.confirmRoutine}>Confirm &amp; Apply Routine</button>
    </section>}
    <p>{onboarding.step > 1 && <button onClick={onboarding.previousStep}>Previous step</button>}{' '}{onboarding.step < 3 && <button onClick={onboarding.nextStep}>Next step</button>}</p>
    <p aria-label="Onboarding confirmation" role="status">{onboarding.confirmation}</p>
  </section>;
}
