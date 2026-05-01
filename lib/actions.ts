'use server';

import { createServerClient } from './supabase';
import { AppSettings, Exercise, PlanExercise, RecommendedWeight, SessionSet, WorkoutPlan, WorkoutSession } from './types';
import { calcEpley1RM } from './utils';

export async function getSettings(): Promise<AppSettings> {
  const db = createServerClient();
  const { data } = await db.from('settings').select('key, value');
  const map: Record<string, string> = {};
  (data || []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
  return {
    compound_rest_seconds: Number(map.compound_rest_seconds ?? 90),
    isolation_rest_seconds: Number(map.isolation_rest_seconds ?? 60),
    compound_weight_increment: Number(map.compound_weight_increment ?? 2.5),
    isolation_weight_increment: Number(map.isolation_weight_increment ?? 1.25),
  };
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  const db = createServerClient();
  const entries = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
  for (const entry of entries) {
    await db.from('settings').upsert(entry, { onConflict: 'key' });
  }
}

export async function getExercises(): Promise<Exercise[]> {
  const db = createServerClient();
  const { data } = await db.from('exercises').select('*').order('category').order('name');
  return data || [];
}

export async function getPlans(): Promise<WorkoutPlan[]> {
  const db = createServerClient();
  const { data } = await db.from('workout_plans').select('*').order('created_at');
  return data || [];
}

export async function getPlanWithExercises(planId: string): Promise<{ plan: WorkoutPlan; exercises: PlanExercise[] } | null> {
  const db = createServerClient();
  const { data: plan } = await db.from('workout_plans').select('*').eq('id', planId).single();
  if (!plan) return null;
  const { data: exercises } = await db
    .from('plan_exercises')
    .select('*, exercise:exercises(*)')
    .eq('plan_id', planId)
    .order('sort_order');
  return { plan, exercises: exercises || [] };
}

export async function createPlan(name: string, description: string): Promise<WorkoutPlan> {
  const db = createServerClient();
  const { data, error } = await db
    .from('workout_plans')
    .insert({ name, description, is_custom: true })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlan(planId: string, name: string, description: string): Promise<void> {
  const db = createServerClient();
  await db.from('workout_plans').update({ name, description }).eq('id', planId);
}

export async function deletePlan(planId: string): Promise<void> {
  const db = createServerClient();
  await db.from('workout_plans').delete().eq('id', planId);
}

export async function updatePlanExercises(planId: string, exercises: Omit<PlanExercise, 'id'>[]): Promise<void> {
  const db = createServerClient();
  await db.from('plan_exercises').delete().eq('plan_id', planId);
  if (exercises.length > 0) {
    await db.from('plan_exercises').insert(
      exercises.map((e, i) => ({ ...e, plan_id: planId, sort_order: i }))
    );
  }
}

export async function getSchedule() {
  const db = createServerClient();
  const { data } = await db
    .from('schedule')
    .select('*, plan:workout_plans(*)')
    .order('day_of_week');
  return data || [];
}

export async function updateSchedule(dayOfWeek: number, planId: string | null): Promise<void> {
  const db = createServerClient();
  const existing = await db.from('schedule').select('id').eq('day_of_week', dayOfWeek).single();
  if (existing.data) {
    await db.from('schedule').update({ plan_id: planId }).eq('day_of_week', dayOfWeek);
  } else {
    await db.from('schedule').insert({ day_of_week: dayOfWeek, plan_id: planId });
  }
}

export async function getActiveSession(): Promise<WorkoutSession | null> {
  const db = createServerClient();
  const { data } = await db
    .from('workout_sessions')
    .select('*')
    .is('finished_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getRecentSessions(limit = 5): Promise<WorkoutSession[]> {
  const db = createServerClient();
  const { data } = await db
    .from('workout_sessions')
    .select('*')
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  return data || [];
}

export async function startSession(planId: string | null, planName: string | null): Promise<WorkoutSession> {
  const db = createServerClient();
  const { data, error } = await db
    .from('workout_sessions')
    .insert({ plan_id: planId, plan_name: planName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function finishSession(sessionId: string): Promise<void> {
  const db = createServerClient();
  await db.from('workout_sessions').update({ finished_at: new Date().toISOString() }).eq('id', sessionId);
}

export async function updateSessionNotes(sessionId: string, notes: string): Promise<void> {
  const db = createServerClient();
  await db.from('workout_sessions').update({ notes }).eq('id', sessionId);
}

export async function getSession(sessionId: string): Promise<WorkoutSession | null> {
  const db = createServerClient();
  const { data } = await db.from('workout_sessions').select('*').eq('id', sessionId).maybeSingle();
  return data;
}

export async function getSessionByToken(token: string): Promise<WorkoutSession | null> {
  const db = createServerClient();
  const { data } = await db.from('workout_sessions').select('*').eq('public_token', token).maybeSingle();
  return data;
}

export async function generatePublicToken(sessionId: string): Promise<string> {
  const db = createServerClient();
  const { nanoid } = await import('nanoid');
  const token = nanoid(12);
  await db.from('workout_sessions').update({ public_token: token }).eq('id', sessionId);
  return token;
}

export async function getSessionSets(sessionId: string): Promise<SessionSet[]> {
  const db = createServerClient();
  const { data } = await db
    .from('session_sets')
    .select('*, exercise:exercises(*)')
    .eq('session_id', sessionId)
    .order('logged_at');
  return data || [];
}

export async function upsertSessionSet(set: Omit<SessionSet, 'id' | 'logged_at'>): Promise<SessionSet> {
  const db = createServerClient();
  const { data, error } = await db
    .from('session_sets')
    .upsert(set, { onConflict: 'session_id,exercise_id,set_number' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSessionSet(sessionId: string, exerciseId: string, setNumber: number): Promise<void> {
  const db = createServerClient();
  await db.from('session_sets')
    .delete()
    .eq('session_id', sessionId)
    .eq('exercise_id', exerciseId)
    .eq('set_number', setNumber);
}

export async function getRecommendedWeight(
  exerciseId: string,
  planExerciseConfig: { rep_min: number; rep_max: number },
  category: 'compound' | 'isolation'
): Promise<RecommendedWeight> {
  const db = createServerClient();

  const settingsResult = await db.from('settings').select('key, value');
  const settingsMap: Record<string, string> = {};
  (settingsResult.data || []).forEach((r: { key: string; value: string }) => { settingsMap[r.key] = r.value; });
  const weightIncrement = category === 'compound'
    ? Number(settingsMap.compound_weight_increment ?? 2.5)
    : Number(settingsMap.isolation_weight_increment ?? 1.25);

  const { data: lastSessions } = await db
    .from('workout_sessions')
    .select('id, started_at')
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(20);

  if (!lastSessions || lastSessions.length === 0) {
    return { weight: null, rep_min: planExerciseConfig.rep_min, rep_max: planExerciseConfig.rep_max, one_rm: null };
  }

  let lastSets: SessionSet[] = [];
  let foundSession = null;

  for (const session of lastSessions) {
    const { data: sets } = await db
      .from('session_sets')
      .select('*')
      .eq('session_id', session.id)
      .eq('exercise_id', exerciseId);

    if (sets && sets.length > 0) {
      lastSets = sets;
      foundSession = session;
      break;
    }
  }

  if (!foundSession || lastSets.length === 0) {
    return { weight: null, rep_min: planExerciseConfig.rep_min, rep_max: planExerciseConfig.rep_max, one_rm: null };
  }

  const repMax = planExerciseConfig.rep_max;
  const repMin = planExerciseConfig.rep_min;
  const lastWeight = Math.max(...lastSets.map(s => s.weight_kg));
  const totalSets = lastSets.length;
  const setsAtMax = lastSets.filter(s => s.reps >= repMax).length;
  const setsBelowMin = lastSets.filter(s => s.reps < repMin).length;

  const bestSet = lastSets.reduce((best, s) => {
    const rm = calcEpley1RM(s.weight_kg, s.reps);
    const bestRm = calcEpley1RM(best.weight_kg, best.reps);
    return rm > bestRm ? s : best;
  }, lastSets[0]);
  const one_rm = calcEpley1RM(bestSet.weight_kg, bestSet.reps);

  let recommendedWeight: number;

  if (setsAtMax === totalSets) {
    recommendedWeight = lastWeight + weightIncrement;
  } else if (setsAtMax >= Math.floor(totalSets * 2 / 3)) {
    recommendedWeight = lastWeight;
  } else if (setsBelowMin > totalSets / 2) {
    recommendedWeight = Math.max(0, lastWeight - weightIncrement);
  } else {
    recommendedWeight = lastWeight;
  }

  return {
    weight: recommendedWeight,
    rep_min: repMin,
    rep_max: repMax,
    one_rm,
  };
}

export async function getExerciseHistory(exerciseId: string, limit = 3) {
  const db = createServerClient();

  const { data: sessions } = await db
    .from('workout_sessions')
    .select('id, started_at')
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(20);

  if (!sessions) return [];

  const results = [];
  for (const session of sessions) {
    const { data: sets } = await db
      .from('session_sets')
      .select('*')
      .eq('session_id', session.id)
      .eq('exercise_id', exerciseId)
      .order('set_number');

    if (sets && sets.length > 0) {
      const bestSet = sets.reduce((best: SessionSet, s: SessionSet) => {
        return s.weight_kg > best.weight_kg ? s : best;
      }, sets[0]);
      const one_rm = calcEpley1RM(bestSet.weight_kg, bestSet.reps);
      const summary = `${sets.length}×${sets[0].reps} @ ${sets[0].weight_kg} кг`;
      results.push({ session_id: session.id, started_at: session.started_at, sets, summary, one_rm });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function getSessionVolume(sessionId: string): Promise<number> {
  const db = createServerClient();
  const { data } = await db.from('session_sets').select('weight_kg, reps').eq('session_id', sessionId);
  if (!data) return 0;
  return data.reduce((sum: number, s: { weight_kg: number; reps: number }) => sum + s.weight_kg * s.reps, 0);
}

// Returns a Set of exercise_ids that achieved an all-time weight PR in this session.
export async function getSessionPRs(sessionId: string): Promise<Set<string>> {
  const db = createServerClient();

  // Get every set from this session
  const { data: sessionSets } = await db
    .from('session_sets')
    .select('exercise_id, weight_kg')
    .eq('session_id', sessionId);

  if (!sessionSets || sessionSets.length === 0) return new Set();

  // Best weight per exercise in this session
  const sessionBest: Record<string, number> = {};
  for (const s of sessionSets as { exercise_id: string; weight_kg: number }[]) {
    if (!sessionBest[s.exercise_id] || s.weight_kg > sessionBest[s.exercise_id]) {
      sessionBest[s.exercise_id] = s.weight_kg;
    }
  }

  const prs = new Set<string>();

  for (const [exerciseId, bestInSession] of Object.entries(sessionBest)) {
    // Find the max weight for this exercise across all OTHER finished sessions
    const { data: allSets } = await db
      .from('session_sets')
      .select('weight_kg, session:workout_sessions!inner(finished_at)')
      .eq('exercise_id', exerciseId)
      .neq('session_id', sessionId)
      .not('session.finished_at', 'is', null);

    const allTimeMax = (allSets as { weight_kg: number }[] | null)?.reduce(
      (max, s) => (s.weight_kg > max ? s.weight_kg : max),
      0
    ) ?? 0;

    if (bestInSession > allTimeMax) {
      prs.add(exerciseId);
    }
  }

  return prs;
}
