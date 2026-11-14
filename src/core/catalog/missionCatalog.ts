import rawCatalog from '../../content/missionCatalog.json';
import type { ExerciseDefinition, ExerciseId, GravityProfileId, MissionCatalog, PlanetaryRouteId, ResistanceExerciseDefinition, ResistanceExerciseId, ValidationResult } from '../types';

export function loadMissionCatalog(): MissionCatalog {
  const result = validateMissionCatalogSchema(rawCatalog);
  if (!result.valid) throw new Error(result.errors.join('; '));
  return structuredClone(rawCatalog) as MissionCatalog;
}

export function validateMissionCatalogSchema(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
  const number = (v: unknown, min: number, max = Infinity): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!record(raw)) return { valid: false, errors: ['catalog must be an object'] };
  if (raw.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  for (const key of ['exercises', 'gravityProfiles', 'routes'] as const) {
    const entries = raw[key];
    const expected = rawCatalog[key];
    if (!Array.isArray(entries)) { errors.push(`${key} must be an array`); continue; }
    const ids = entries.map(e => record(e) ? e.id : undefined);
    if (ids.length !== expected.length || new Set(ids).size !== ids.length || expected.some(e => !ids.includes(e.id))) {
      errors.push(`${key} must contain each approved id exactly once`);
    }
    for (const [index, entry] of entries.entries()) {
      const path = `${key}[${index}]`;
      if (!record(entry)) { errors.push(`${path} must be an object`); continue; }
      if (!text(entry.name)) errors.push(`${path}.name must be nonempty`);
      if (key === 'exercises') {
        const definition = rawCatalog.exercises.find(e => e.id === entry.id);
        if (!definition || entry.kind !== definition.kind) errors.push(`${path}.kind does not match exercise id`);
        if (!number(entry.earthLoadMultiplier, Number.EPSILON)) errors.push(`${path}.earthLoadMultiplier must be positive`);
        if (entry.kind === 'CARDIO') {
          if (!number(entry.distanceMultiplier, Number.EPSILON)) errors.push(`${path}.distanceMultiplier must be positive`);
        } else if (entry.kind === 'RESISTANCE') {
          for (const side of ['leftJoint', 'rightJoint']) {
            const joint = entry[side];
            if (!Array.isArray(joint) || joint.length !== 3 || new Set(joint).size !== 3 || joint.some(i => !number(i, 0, 32) || !Number.isInteger(i))) errors.push(`${path}.${side} requires three distinct landmark indices in 0..32`);
          }
          for (const field of ['startAngleDeg', 'targetAngleDeg', 'maxTrunkLeanDeg', 'symmetryToleranceDeg']) {
            if (!number(entry[field], 0, 180)) errors.push(`${path}.${field} must be in 0..180`);
          }
          if (entry.startAngleDeg === entry.targetAngleDeg) errors.push(`${path}.targetAngleDeg must differ from startAngleDeg`);
          const range = Math.abs(Number(entry.startAngleDeg) - Number(entry.targetAngleDeg));
          if (!number(entry.hysteresisDeg, Number.EPSILON) || entry.hysteresisDeg * 2 >= range) errors.push(`${path}.hysteresisDeg must leave distinct start and target bands`);
          if (!number(entry.defaultLoadKg, 0)) errors.push(`${path}.defaultLoadKg must be nonnegative`);
        }
      } else if (key === 'gravityProfiles') {
        const profile = rawCatalog.gravityProfiles.find(p => p.id === entry.id);
        if (!profile || entry.gravityG !== profile.gravityG) errors.push(`${path}.gravityG must match the approved profile`);
      } else {
        const route = rawCatalog.routes.find(r => r.id === entry.id);
        if (!route || entry.totalDistanceKm !== route.totalDistanceKm) errors.push(`${path}.totalDistanceKm must match the approved route`);
        let previous = -1;
        const milestoneIds = new Set();
        if (!Array.isArray(entry.milestones) || entry.milestones.length === 0) errors.push(`${path}.milestones must be nonempty`);
        else for (const milestone of entry.milestones) {
          if (!record(milestone) || !text(milestone.id) || !text(milestone.name) || milestoneIds.has(milestone.id) || !number(milestone.distanceKm, 0, Number(entry.totalDistanceKm)) || milestone.distanceKm <= previous) {
            errors.push(`${path}.milestones require unique ids and increasing distances within the route`);
          } else { previous = milestone.distanceKm; milestoneIds.add(milestone.id); }
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function getExerciseById(id: ResistanceExerciseId): ResistanceExerciseDefinition;
export function getExerciseById(id: ExerciseId): ExerciseDefinition;
export function getExerciseById(id: ExerciseId): ExerciseDefinition {
  const exercise = loadMissionCatalog().exercises.find(e => e.id === id);
  if (!exercise) throw new RangeError(`Unknown exercise: ${id}`);
  return exercise;
}
export function getPlanetaryRouteById(id: PlanetaryRouteId) {
  const route = loadMissionCatalog().routes.find(r => r.id === id);
  if (!route) throw new RangeError(`Unknown planetary route: ${id}`);
  return route;
}
export function getGravityProfileById(id: GravityProfileId) {
  const profile = loadMissionCatalog().gravityProfiles.find(g => g.id === id);
  if (!profile) throw new RangeError(`Unknown gravity profile: ${id}`);
  return profile;
}
