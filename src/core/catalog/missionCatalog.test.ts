import { expect, test } from 'vitest';
import type catalogJson from '../../content/missionCatalog.json';
import { loadMissionCatalog, validateMissionCatalogSchema } from './missionCatalog';

test('provides descriptive virtual-route milestones and rejects empty descriptions', () => {
  const catalog = loadMissionCatalog();
  expect(catalog.routes.every(route => route.milestones.every(milestone => typeof milestone.description === 'string' && milestone.description.trim().length > 0))).toBe(true);
  const raw = structuredClone(catalog);
  Object.assign(raw.routes[0].milestones[0], { description: '' });
  expect(validateMissionCatalogSchema(raw).errors.join(' ')).toContain('milestones');
});

test('provides sample schedule times in validated HH:MM format', () => {
  const catalog = loadMissionCatalog();
  expect(catalog.exercises.map(exercise => exercise.scheduledTime)).toEqual(['08:00', '08:15', '08:30', '08:45', '09:00', '09:30', '10:00']);
  const raw = structuredClone(catalog);
  Object.assign(raw.exercises[0], { scheduledTime: '25:00' });
  expect(validateMissionCatalogSchema(raw).errors.join(' ')).toContain('scheduledTime');
});

test('loads the approved version 1 mission catalog', () => {
  const catalog = loadMissionCatalog();
  expect(catalog.schemaVersion).toBe(1);
  expect(catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => e.id))
    .toEqual(['SQUAT', 'DEADLIFT', 'OVERHEAD_PRESS', 'BICEP_CURL']);
  expect(catalog.exercises.filter(e => e.kind === 'CARDIO').map(e => e.id))
    .toEqual(['TREADMILL', 'CYCLE_ERGOMETER', 'ROWING']);
  expect(catalog.gravityProfiles.map(g => g.gravityG)).toEqual([0, 0.16, 0.38]);
  expect(catalog.routes.map(r => [r.id, r.totalDistanceKm]))
    .toEqual([['VALLES_MARINERIS', 4000], ['OLYMPUS_MONS', 600]]);
  expect(validateMissionCatalogSchema(catalog)).toEqual({ valid: true, errors: [] });
});

test('validates catalog structure and diagnoses corrupt exercise, gravity, and route fields', async () => {
  const { getExerciseById, getPlanetaryRouteById, getGravityProfileById } = await import('./missionCatalog');
  expect(getExerciseById('SQUAT')).toMatchObject({ leftJoint: [23, 25, 27], targetAngleDeg: 95 });
  expect(getPlanetaryRouteById('OLYMPUS_MONS').totalDistanceKm).toBe(600);
  expect(getGravityProfileById('MARS_038G').gravityG).toBe(0.38);
  const corruptions: [string, (raw: typeof catalogJson) => void][] = [
    ['leftJoint', c => { c.exercises[0].leftJoint![0] = -1; }],
    ['rightJoint', c => { c.exercises[0].rightJoint![1] = 35; }],
    ['leftJoint', c => { c.exercises[0].leftJoint = [23, 23, 27]; }],
    ['targetAngleDeg', c => { c.exercises[0].targetAngleDeg = 170; }],
    ['startAngleDeg', c => { c.exercises[0].startAngleDeg = NaN; }],
    ['hysteresisDeg', c => { c.exercises[0].hysteresisDeg = 100; }],
    ['distanceMultiplier', c => { c.exercises[4].distanceMultiplier = -1; }],
    ['exercises', c => { c.exercises[1] = c.exercises[0]; }],
    ['gravityG', c => { c.gravityProfiles[0].gravityG = -1; }],
    ['milestones', c => { c.routes[0].milestones[1].distanceKm = 20; }],
    ['milestones', c => { c.routes[0].milestones[2].distanceKm = 5000; }],
    ['name', c => { c.routes[0].name = ''; }],
  ];
  for (const [field, corrupt] of corruptions) {
    const catalog = loadMissionCatalog() as unknown as typeof catalogJson;
    corrupt(catalog);
    const result = validateMissionCatalogSchema(catalog);
    expect(result.valid, field).toBe(false);
    expect(result.errors.join(' ')).toContain(field);
  }
  for (const raw of [null, [], {}, { schemaVersion: 1 }, { schemaVersion: 2 }]) {
    expect(validateMissionCatalogSchema(raw).valid).toBe(false);
  }
  // A caller cannot corrupt the catalog used by another consumer.
  const catalog = loadMissionCatalog();
  (catalog.exercises as unknown[]).pop();
  expect(loadMissionCatalog().exercises).toHaveLength(7);
});
