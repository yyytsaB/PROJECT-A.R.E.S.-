import type { AstronautProfile, PreSpaceProfileFields } from '../types';

export const PROFILE_DEFAULTS: PreSpaceProfileFields = {
  heightCm: 175, restingHeartRateBpm: 60, systolicBpMmHg: 118, diastolicBpMmHg: 76,
  injuryLimitations: 'NONE', injuryNotes: '', missionType: 'MARS_TRANSIT_360D', missionDurationDays: 360, autoAdjustRoutine: true,
};

export function withProfileDefaults(profile: AstronautProfile): AstronautProfile & PreSpaceProfileFields {
  const hydrated = { ...PROFILE_DEFAULTS, ...profile };
  for (const key of Object.keys(PROFILE_DEFAULTS) as (keyof PreSpaceProfileFields)[]) {
    if (hydrated[key] === undefined) Object.assign(hydrated, { [key]: PROFILE_DEFAULTS[key] });
  }
  return hydrated;
}
