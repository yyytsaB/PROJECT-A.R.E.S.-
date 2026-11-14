import { PROFILE_DEFAULTS } from '../telemetry/profileDefaults';
import type { MissionStoreState, PreSpaceProfileFields } from '../types';

/** Default-valued M6 fields remain implicit, preserving version-1 cache compatibility. */
export function serializeMissionStore(state: MissionStoreState): string {
  const profile = { ...state.profile };
  for (const key of Object.keys(PROFILE_DEFAULTS) as (keyof PreSpaceProfileFields)[]) {
    if (profile[key] === PROFILE_DEFAULTS[key]) delete profile[key];
  }
  const stored = { ...state, profile };
  if (stored.routineNotification === '') delete stored.routineNotification;
  return JSON.stringify(stored);
}
