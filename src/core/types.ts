export interface Point3D { readonly x: number; readonly y: number; readonly z: number }
export interface PoseLandmark33 extends Point3D { readonly visibility: number }
export interface RawPoseFrame {
  readonly landmarks: readonly PoseLandmark33[];
  readonly width: number;
  readonly height: number;
  readonly timestampMs: number;
}
export interface NormalizedPose33 {
  readonly landmarks: readonly PoseLandmark33[];
  readonly timestampMs: number;
}
export type ResistanceExerciseId = 'SQUAT' | 'DEADLIFT' | 'OVERHEAD_PRESS' | 'BICEP_CURL';
export type CardioExerciseId = 'TREADMILL' | 'CYCLE_ERGOMETER' | 'ROWING';
export type ExerciseId = ResistanceExerciseId | CardioExerciseId;
export type JointTriplet = readonly [number, number, number];
interface ExerciseBase { readonly id: ExerciseId; readonly name: string; readonly scheduledTime: string; readonly earthLoadMultiplier: number }
export interface ResistanceExerciseDefinition extends ExerciseBase {
  readonly id: ResistanceExerciseId;
  readonly kind: 'RESISTANCE';
  readonly leftJoint: JointTriplet;
  readonly rightJoint: JointTriplet;
  readonly startAngleDeg: number;
  readonly targetAngleDeg: number;
  readonly hysteresisDeg: number;
  readonly maxTrunkLeanDeg: number;
  readonly symmetryToleranceDeg: number;
  readonly defaultLoadKg: number;
}
export interface CardioExerciseDefinition extends ExerciseBase {
  readonly id: CardioExerciseId;
  readonly kind: 'CARDIO';
  readonly distanceMultiplier: number;
}
export type ExerciseDefinition = ResistanceExerciseDefinition | CardioExerciseDefinition;
export type GravityProfileId = 'MICROGRAVITY_0G' | 'MOON_016G' | 'MARS_038G';
export interface GravityProfile {
  readonly id: GravityProfileId; readonly name: string; readonly gravityG: number;
  /** Team-defined demo goal; not a NASA standard or clinical threshold. */
  readonly prototypeGoalPct: number;
}
export type PlanetaryRouteId = 'VALLES_MARINERIS' | 'OLYMPUS_MONS';
export interface RouteMilestone { readonly id: string; readonly name: string; readonly description: string; readonly distanceKm: number }
export interface PlanetaryRoute {
  readonly id: PlanetaryRouteId; readonly name: string;
  readonly totalDistanceKm: number; readonly milestones: readonly RouteMilestone[];
}
export interface MissionCatalog {
  readonly schemaVersion: 1;
  readonly exercises: readonly ExerciseDefinition[];
  readonly gravityProfiles: readonly GravityProfile[];
  readonly routes: readonly PlanetaryRoute[];
}
export interface ValidationResult { readonly valid: boolean; readonly errors: readonly string[] }
export type FormFaultFlag = 'DEPTH_INSUFFICIENT' | 'SPINE_MISALIGNED' | 'BILATERAL_ASYMMETRY' | 'LOW_VISIBILITY';
export interface KinematicFrameAnalysis {
  readonly primaryAngleDeg: number; readonly leftAngleDeg: number; readonly rightAngleDeg: number;
  readonly romPct: number; readonly symmetryScorePct: number; readonly trunkLeanDeg: number;
  readonly faultFlags: readonly FormFaultFlag[]; readonly isVisible: boolean;
}
export type RepPhase = 'IDLE' | 'ECCENTRIC' | 'INFLECTION' | 'CONCENTRIC' | 'COMPLETED';
export interface KinematicSnapshot {
  readonly frameWidth?: number; readonly frameHeight?: number;
  readonly repNumber: number; readonly timestampMs: number; readonly exerciseId: ExerciseId;
  readonly faultFlags: readonly FormFaultFlag[]; readonly primaryAngleDeg: number;
  readonly symmetryScorePct: number; readonly landmarks: readonly PoseLandmark33[];
}
export interface RepMachineState {
  readonly exerciseId: ExerciseId; readonly phase: RepPhase; readonly repCount: number;
  readonly faultedRepCount: number; readonly formAccuracyPct: number;
  readonly snapshots: readonly KinematicSnapshot[]; readonly faultFlags: readonly FormFaultFlag[];
  readonly peakProgressDeg: number; readonly peakFrame: RawPoseFrame | null;
  readonly peakAnalysis: KinematicFrameAnalysis | null; readonly lastTimestampMs: number | null;
  readonly departureFrames: number; readonly returnFrames: number;
  readonly isArmed: boolean;
  readonly previousFrame: RawPoseFrame | null; readonly previousAnalysis: KinematicFrameAnalysis | null;
  readonly targetConfirmed: boolean;
}
export interface RepMachineStepResult {
  readonly state: RepMachineState; readonly analysis: KinematicFrameAnalysis | null;
  readonly activeFaultAlerts: readonly string[]; readonly capturedSnapshots: readonly KinematicSnapshot[];
}
export type InjuryLimitation = 'NONE' | 'KNEE_SENSITIVITY' | 'LOWER_BACK_SENSITIVITY' | 'SHOULDER_MOBILITY';
export type MissionType = 'MARS_TRANSIT_360D' | 'LUNAR_ARTEMIS_30D' | 'ISS_ORBITAL_180D';
export interface PreSpaceProfileFields {
  readonly heightCm: number; readonly restingHeartRateBpm: number;
  readonly systolicBpMmHg: number; readonly diastolicBpMmHg: number;
  readonly injuryLimitations: InjuryLimitation; readonly injuryNotes: string;
  readonly missionType: MissionType; readonly missionDurationDays: number; readonly autoAdjustRoutine: boolean;
}
export interface AstronautProfile extends Partial<PreSpaceProfileFields> {
  readonly bodyWeightKg: number;
  readonly id: string; readonly name: string; readonly gravityProfileId: GravityProfileId;
  readonly routeId: PlanetaryRouteId; readonly earthBaseline1RM: Readonly<Record<ResistanceExerciseId, number>>;
}
export interface CompletedWorkoutInput {
  readonly durationSec: number;
  readonly id: string; readonly exerciseId: ExerciseId; readonly completedAtIso: string;
  readonly sets: number; readonly reps: number; readonly loadKg: number; readonly cardioDistanceKm: number;
  readonly formAccuracyPct: number; readonly symmetryScorePct: number;
  readonly snapshots: readonly KinematicSnapshot[];
}
export interface WorkoutSessionRecord extends CompletedWorkoutInput {
  readonly astronautId: string; readonly gravityProfileId: GravityProfileId;
  readonly resistanceVolumeKg: number; readonly effectiveLoadKg: number; readonly expeditionDistanceKm: number;
}
export interface ExpeditionProgressReport {
  readonly routeId: PlanetaryRouteId; readonly cumulativeDistanceKm: number; readonly progressPct: number;
  readonly unlockedMilestones: readonly RouteMilestone[];
}
export type StrengthRetentionScore = number;
export type WorkoutDateRange = 'LAST_7_DAYS' | 'LAST_14_DAYS' | 'LAST_30_DAYS' | 'ALL';
export interface DailyRetentionPoint { readonly dateIso: string; readonly strengthRetentionPct: StrengthRetentionScore }
export interface MedicalTelemetryReport {
  readonly strengthRetentionPct: StrengthRetentionScore; readonly dailyRetentionSeries: readonly DailyRetentionPoint[];
  readonly cumulativeVolumeKg: number; readonly symmetryConsistencyPct: number;
  readonly faultCounts: Readonly<Record<FormFaultFlag, number>>; readonly sessions: readonly WorkoutSessionRecord[];
}
export type CommsLinkStatus = 'BLACKOUT_24MIN_DELAY' | 'WINDOW_OPEN';
export interface SyncQueueEnvelope {
  readonly sessionId: string; readonly astronautId: string; readonly exerciseId: ExerciseId;
  readonly reps: number; readonly formAccuracyPct: number; readonly volumeKg: number;
  readonly completedAtIso: string; readonly status: 'QUEUED_BLACKOUT';
}
export interface SyncQueueSummary { readonly pendingCount: number; readonly lastSyncedAtIso: string | null }
export interface MissionControlAck { readonly sessionId: string; readonly acknowledgedAtIso: string }
export interface MissionStoreState {
  readonly personalizedRoutine?: PersonalizedRoutinePlan;
  readonly routineNotification?: string;
  readonly scheduleCompletion: Readonly<Record<string, Readonly<Partial<Record<ExerciseId, boolean>>>>>;
  readonly schemaVersion: 1; readonly profile: AstronautProfile; readonly sessions: readonly WorkoutSessionRecord[];
  readonly syncQueue: readonly SyncQueueEnvelope[]; readonly commsStatus: CommsLinkStatus;
  readonly acknowledgements: readonly MissionControlAck[]; readonly lastSyncedAtIso: string | null;
}
export interface PersonalizedRoutineItem {
  readonly exerciseId: ExerciseId; readonly name: string; readonly kind: 'RESISTANCE' | 'CARDIO'; readonly scheduledTime: string;
  readonly targetSets: number; readonly targetReps: number; readonly recommendedLoadKg: number; readonly targetCardioKm: number; readonly rationale: string;
}
export interface PersonalizedRoutinePlan {
  readonly routineId: string; readonly generatedAtIso: string;
  readonly summaryLabel: 'Personalized for you — Adapted to your progress';
  readonly disclaimer: string; readonly items: readonly PersonalizedRoutineItem[];
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface TelemetrySyncClient { sendBatch(envelopes: readonly SyncQueueEnvelope[]): Promise<void> }
export interface FlightSurgeonReport {
  readonly json: { readonly profile: AstronautProfile; readonly telemetry: MedicalTelemetryReport; readonly syncSummary: SyncQueueSummary; readonly exportedAtIso: string };
  readonly csv: string;
}
export type SimulatedRepKind = 'GOOD' | 'SHALLOW' | 'SPINE_FAULT' | 'ASYMMETRIC';
export interface UseWorkoutArenaOptions { readonly exerciseId?: ResistanceExerciseId; readonly onCompleted?: (state: RepMachineState, durationSec: number) => void }
export interface WorkoutArenaController {
  readonly state: RepMachineState; readonly analysis: KinematicFrameAnalysis | null;
  readonly activeFaultAlerts: readonly string[]; readonly isRunning: boolean;
  start(mode: 'LIVE' | 'SIMULATED'): Promise<void>; pause(): void; resume(): void; stop(): void;
  triggerSimulatedRep(kind: SimulatedRepKind): void;
}
