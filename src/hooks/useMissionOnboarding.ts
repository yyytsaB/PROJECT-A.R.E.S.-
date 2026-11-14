import { useEffect, useRef, useState } from 'react';
import { calculateBmi, generatePersonalizedRoutine } from '../core/telemetry/telemetryEngine';
import { withProfileDefaults } from '../core/telemetry/profileDefaults';
import { profileWithFields, readProfileField, validateProfileFields } from '../core/telemetry/profileFields';
import type { ProfileEdits, ProfileField } from '../core/telemetry/profileFields';
import type { GravityProfileId, InjuryLimitation, MissionType, PersonalizedRoutinePlan } from '../core/types';
import rules from '../content/routineRules.json';
import { useMissionTelemetry } from './useMissionTelemetry';

export function useMissionOnboarding({ processingDelayMs = 150 }: { processingDelayMs?: number } = {}) {
  const mission = useMissionTelemetry();
  const latest = useRef(mission); latest.current = mission;
  const [base, setBase] = useState(() => withProfileDefaults(mission.state.profile));
  const [edits, setEdits] = useState<ProfileEdits>({});
  const [errors, setErrors] = useState<ProfileEdits>({});
  const [step, setStep] = useState(1);
  const [isBuilding, setBuilding] = useState(false);
  const [preview, setPreview] = useState<PersonalizedRoutinePlan | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const profile = profileWithFields(base, edits);
  const fieldValue = (field: ProfileField) => edits[field] ?? readProfileField(base, field);
  let bmi: number | null = null;
  try { bmi = calculateBmi(profile.bodyWeightKg, profile.heightCm); } catch { /* Invalid input remains editable. */ }
  function cancelPending() { generation.current++; if (pending.current !== null) clearTimeout(pending.current); pending.current = null; }
  function invalidatePreview() { cancelPending(); setBuilding(false); setPreview(null); setConfirmation(''); setErrorMessage(''); }
  function setField(field: ProfileField, value: string) {
    invalidatePreview(); const next = { ...edits, [field]: value }; setEdits(next); setErrors(validateProfileFields(base, next));
  }
  function nextStep() {
    const validation = validateProfileFields(base, edits); setErrors(validation);
    const fields: ProfileField[] = step === 1 ? ['name', 'heightCm', 'bodyWeightKg', 'restingHeartRateBpm', 'systolicBpMmHg', 'diastolicBpMmHg']
      : ['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL'];
    if (!fields.some(field => validation[field])) { invalidatePreview(); setStep(value => Math.min(3, value + 1)); }
  }
  function generateRoutine() {
    const validation = validateProfileFields(base, edits); setErrors(validation);
    if (Object.keys(validation).length) return;
    invalidatePreview(); setBuilding(true);
    const version = generation.current, snapshot = profile;
    pending.current = setTimeout(() => {
      if (version !== generation.current) return;
      pending.current = null;
      try { setPreview(generatePersonalizedRoutine(snapshot, latest.current.state.sessions, latest.current.nowIso)); }
      catch { setErrorMessage('Review the profile values before generating a routine.'); }
      setBuilding(false);
    }, Math.max(0, processingDelayMs));
  }
  function confirmRoutine() {
    if (!preview || isBuilding || confirmation) return;
    latest.current.applyPersonalizedRoutine(profile, preview); setConfirmation('Profile and routine confirmed and applied.');
  }
  useEffect(() => () => cancelPending(), []);
  useEffect(() => { invalidatePreview(); }, [mission.state.sessions]);
  useEffect(() => { invalidatePreview(); setBase(withProfileDefaults(mission.state.profile)); setEdits({}); setErrors({}); setStep(1); }, [mission.missionRevision]);
  return { profile, step, fieldValue, setField, errors, bmi, preview, isBuilding, confirmation, errorMessage, nextStep, generateRoutine, confirmRoutine,
    previousStep: () => { invalidatePreview(); setStep(value => Math.max(1, value - 1)); },
    setLimitation: (injuryLimitations: InjuryLimitation) => { invalidatePreview(); setBase(previous => ({ ...previous, injuryLimitations })); },
    setGravity: (gravityProfileId: GravityProfileId) => { invalidatePreview(); setBase(previous => ({ ...previous, gravityProfileId })); },
    setMission: (missionType: MissionType) => { invalidatePreview(); setBase(previous => ({ ...previous, missionType })); setEdits(previous => ({ ...previous, missionDurationDays: String(rules.missions[missionType].durationDays) })); } };
}
