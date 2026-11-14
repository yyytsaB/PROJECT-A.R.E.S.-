import { withProfileDefaults } from './profileDefaults';
import type { AstronautProfile, ResistanceExerciseId } from '../types';

export const HEALTH_FIELDS = [
  { key: 'heightCm', label: 'Height (cm)', name: 'Height', unit: 'cm' },
  { key: 'bodyWeightKg', label: 'Body weight (kg)', name: 'Body weight', unit: 'kg' },
  { key: 'restingHeartRateBpm', label: 'Resting heart rate (bpm)', name: 'Resting heart rate', unit: 'bpm' },
  { key: 'systolicBpMmHg', label: 'Systolic blood pressure (mmHg)', name: 'Systolic blood pressure', unit: 'mmHg' },
  { key: 'diastolicBpMmHg', label: 'Diastolic blood pressure (mmHg)', name: 'Diastolic blood pressure', unit: 'mmHg' },
] as const;
export type ProfileField = 'name' | 'injuryNotes' | 'missionDurationDays' | (typeof HEALTH_FIELDS)[number]['key'] | ResistanceExerciseId;
export type ProfileEdits = Partial<Record<ProfileField, string>>;
export function readProfileField(profile: AstronautProfile, field: ProfileField): string {
  return String({ ...withProfileDefaults(profile), ...profile.earthBaseline1RM }[field]);
}
export function profileWithFields(profile: AstronautProfile, edits: ProfileEdits) {
  const next = { ...withProfileDefaults(profile), earthBaseline1RM: { ...profile.earthBaseline1RM } };
  for (const [field, value] of Object.entries(edits) as [ProfileField, string][]) {
    if (field in next.earthBaseline1RM) next.earthBaseline1RM[field as ResistanceExerciseId] = value.trim() ? Number(value) : NaN;
    else Object.assign(next, { [field]: field === 'name' ? value.trim() : field === 'injuryNotes' ? value : value.trim() ? Number(value) : NaN });
  }
  return next;
}
export function validateProfileFields(profile: AstronautProfile, edits: ProfileEdits): ProfileEdits {
  const candidate = profileWithFields(profile, edits), errors: ProfileEdits = {};
  if (!candidate.name.trim()) errors.name = 'Enter an astronaut name.';
  for (const metric of HEALTH_FIELDS) if (!Number.isFinite(candidate[metric.key]) || candidate[metric.key] <= 0) errors[metric.key] = `${metric.name} must be greater than 0 ${metric.unit}.`;
  for (const [id, value] of Object.entries(candidate.earthBaseline1RM)) if (!Number.isFinite(value) || value <= 0) errors[id as ResistanceExerciseId] = `${id} Earth baseline must be greater than 0 kg.`;
  if (!Number.isInteger(candidate.missionDurationDays) || candidate.missionDurationDays <= 0) errors.missionDurationDays = 'Mission duration must be a positive whole number of days.';
  if (!errors.systolicBpMmHg && !errors.diastolicBpMmHg && candidate.systolicBpMmHg <= candidate.diastolicBpMmHg) {
    errors.systolicBpMmHg = errors.diastolicBpMmHg = 'Systolic pressure must be greater than diastolic pressure.';
  }
  return errors;
}
