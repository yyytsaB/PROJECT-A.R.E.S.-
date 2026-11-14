import type { TelemetrySyncClient } from '../core/types';

interface SupabaseSyncOptions { readonly url?: string; readonly anonKey?: string; readonly fetch?: typeof fetch }

/** workout_logs.id must be a unique session ID so a retried batch is idempotent. */
export function createSupabaseSyncAdapter(options: SupabaseSyncOptions = {}): TelemetrySyncClient | undefined {
  const url = options.url ?? import.meta.env.VITE_SUPABASE_URL;
  const key = options.anonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  const send = options.fetch ?? fetch;
  return { async sendBatch(envelopes) {
    const response = await send(`${url.replace(/\/$/, '')}/rest/v1/workout_logs?on_conflict=id`, {
      method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(envelopes.map(e => ({ id: e.sessionId, user_id: e.astronautId, exercise_type: e.exerciseId,
        reps_counted: e.reps, form_accuracy: e.formAccuracyPct, volume_kg: e.volumeKg, date: e.completedAtIso }))),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Telemetry sync failed (${response.status})`);
  } };
}
