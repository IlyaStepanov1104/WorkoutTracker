'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WorkoutSession, SessionSet, PlanExercise, Exercise, AppSettings } from '@/lib/types';
import { WorkoutProvider } from '@/context/WorkoutContext';
import { finishSession, getRecommendedWeight, getExerciseHistory } from '@/lib/actions';
import { useElapsedTimer } from '@/hooks/useTimer';
import { formatShortDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, Plus, ChevronDown, ChevronRight, Flag } from 'lucide-react';
import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimerOverlay } from '@/components/RestTimerOverlay';
import { showToast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase';

interface Props {
  session: WorkoutSession;
  initialSets: SessionSet[];
  planExercises: PlanExercise[];
  allExercises: Exercise[];
  settings: AppSettings;
}

interface ExerciseBlock {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  category: 'compound' | 'isolation';
  sets: number;
  rep_min: number;
  rep_max: number;
  isPlan: boolean;
}

interface SetRow {
  weight: string;
  reps: string;
  completed: boolean;
}

export function WorkoutPageClient(props: Props) {
  return (
    <WorkoutProvider>
      <WorkoutInner {...props} />
    </WorkoutProvider>
  );
}

function WorkoutInner({ session, initialSets, planExercises, allExercises, settings }: Props) {
  const router = useRouter();
  const elapsed = useElapsedTimer(session.started_at);

  const [exercises, setExercises] = useState<ExerciseBlock[]>(() => {
    const blocks: ExerciseBlock[] = planExercises.map(pe => ({
      exercise_id: pe.exercise_id,
      exercise_name: pe.exercise?.name ?? '',
      muscle_group: pe.exercise?.muscle_group ?? '',
      category: pe.exercise?.category ?? 'compound',
      sets: pe.sets,
      rep_min: pe.rep_min,
      rep_max: pe.rep_max,
      isPlan: true,
    }));
    // Also add exercises from existing sets not in plan
    initialSets.forEach(s => {
      if (!blocks.find(b => b.exercise_id === s.exercise_id)) {
        const ex = allExercises.find(e => e.id === s.exercise_id);
        blocks.push({
          exercise_id: s.exercise_id,
          exercise_name: s.exercise_name,
          muscle_group: ex?.muscle_group ?? '',
          category: ex?.category ?? 'compound',
          sets: 3,
          rep_min: ex?.default_rep_min ?? 8,
          rep_max: ex?.default_rep_max ?? 12,
          isPlan: false,
        });
      }
    });
    return blocks;
  });

  // sets state per exercise: exerciseId -> SetRow[]
  const [setRows, setSetRows] = useState<Record<string, SetRow[]>>(() => {
    const rows: Record<string, SetRow[]> = {};
    initialSets.forEach(s => {
      if (!rows[s.exercise_id]) rows[s.exercise_id] = [];
      rows[s.exercise_id].push({ weight: String(s.weight_kg), reps: String(s.reps), completed: true });
    });
    return rows;
  });

  const [recommendations, setRecommendations] = useState<Record<string, { weight: number | null; one_rm: number | null }>>({});
  const [histories, setHistories] = useState<Record<string, unknown[]>>({});
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restTimer, setRestTimer] = useState<{ exerciseId: string; isCompound: boolean } | null>(null);
  const [finishing, setFinishing] = useState(false);

  const totalCompleted = Object.values(setRows).flat().filter(s => s.completed).length;

  const exercisesRef = React.useRef(exercises);

  useEffect(() => {
    exercisesRef.current.forEach(async ex => {
      const rec = await getRecommendedWeight(ex.exercise_id, { rep_min: ex.rep_min, rep_max: ex.rep_max }, ex.category);
      setRecommendations(prev => ({ ...prev, [ex.exercise_id]: rec }));

      // Init rows if not from existing sets
      setSetRows(prev => {
        if (prev[ex.exercise_id]?.length) return prev;
        const rows: SetRow[] = Array.from({ length: ex.sets }, () => ({
          weight: rec.weight !== null ? String(rec.weight) : '',
          reps: String(ex.rep_min),
          completed: false,
        }));
        return { ...prev, [ex.exercise_id]: rows };
      });
    });
  }, []);

  async function loadHistory(exerciseId: string) {
    if (histories[exerciseId]) return;
    const h = await getExerciseHistory(exerciseId, 3);
    setHistories(prev => ({ ...prev, [exerciseId]: h }));
  }

  function updateRow(exerciseId: string, rowIdx: number, field: 'weight' | 'reps', value: string) {
    setSetRows(prev => {
      const rows = [...(prev[exerciseId] ?? [])];
      rows[rowIdx] = { ...rows[rowIdx], [field]: value };
      return { ...prev, [exerciseId]: rows };
    });
  }

  async function completeSet(exerciseId: string, rowIdx: number, isCompound: boolean, exerciseName: string) {
    const rows = setRows[exerciseId] ?? [];
    const row = rows[rowIdx];
    if (!row) return;
    const weight = parseFloat(row.weight) || 0;
    const reps = parseInt(row.reps) || 0;

    // Optimistic update
    setSetRows(prev => {
      const updated = [...(prev[exerciseId] ?? [])];
      updated[rowIdx] = { ...updated[rowIdx], completed: true };
      return { ...prev, [exerciseId]: updated };
    });

    // Persist to Supabase
    try {
      await supabase.from('session_sets').upsert({
        session_id: session.id,
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        set_number: rowIdx + 1,
        weight_kg: weight,
        reps,
      }, { onConflict: 'session_id,exercise_id,set_number' });
    } catch {}

    // Show rest timer
    setRestTimer({ exerciseId, isCompound });
  }

  function addSetRow(exerciseId: string, rep_min: number) {
    const rec = recommendations[exerciseId];
    setSetRows(prev => {
      const rows = prev[exerciseId] ?? [];
      return {
        ...prev,
        [exerciseId]: [...rows, {
          weight: rec?.weight !== null ? String(rec?.weight ?? '') : '',
          reps: String(rep_min),
          completed: false,
        }],
      };
    });
  }

  function addExercise(exercise: Exercise) {
    if (exercises.find(e => e.exercise_id === exercise.id)) {
      showToast('Упражнение уже добавлено', 'info');
      return;
    }
    setExercises(prev => [...prev, {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      category: exercise.category,
      sets: 3,
      rep_min: exercise.default_rep_min,
      rep_max: exercise.default_rep_max,
      isPlan: false,
    }]);
    setSetRows(prev => ({
      ...prev,
      [exercise.id]: Array.from({ length: 3 }, () => ({ weight: '', reps: String(exercise.default_rep_min), completed: false })),
    }));
  }

  async function handleFinish() {
    if (totalCompleted === 0) { showToast('Сначала выполните хотя бы 1 подход', 'error'); return; }
    setFinishing(true);
    try {
      await finishSession(session.id);
      router.push(`/workout/${session.id}/report`);
    } catch {
      showToast('Ошибка при завершении', 'error');
      setFinishing(false);
    }
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-2 z-10 -mx-4 px-4">
        <div>
          <h1 className="text-lg font-bold">{session.plan_name || 'Произвольная тренировка'}</h1>
          <p className="text-sm text-muted-foreground font-mono">{elapsed}</p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleFinish}
          disabled={finishing || totalCompleted === 0}
        >
          <Flag className="h-4 w-4 mr-1" />
          Завершить
        </Button>
      </div>

      {exercises.map(ex => {
        const rows = setRows[ex.exercise_id] ?? [];
        const rec = recommendations[ex.exercise_id];
        const hist = histories[ex.exercise_id] as Array<{ started_at: string; summary: string; one_rm: number | null }> | undefined;
        const isHistOpen = historyOpen[ex.exercise_id];

        return (
          <Card key={ex.exercise_id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{ex.exercise_name}</CardTitle>
                  <Badge variant="secondary" className="text-xs mt-1">{ex.muscle_group}</Badge>
                </div>
              </div>

              {/* Recommendation banner */}
              {rec && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md text-sm">
                  {rec.weight !== null ? (
                    <span>
                      💡 Рекомендуется: <strong>{rec.weight} кг</strong> × {ex.rep_min}–{ex.rep_max} повт.
                      {rec.one_rm && <span className="ml-2 text-xs text-muted-foreground">1RM ≈ {rec.one_rm} кг</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Нет данных — выбери стартовый вес</span>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-2">
              {/* History collapsible */}
              <Collapsible
                open={isHistOpen}
                onOpenChange={v => {
                  setHistoryOpen(prev => ({ ...prev, [ex.exercise_id]: v }));
                  if (v) loadHistory(ex.exercise_id);
                }}
              >
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  {isHistOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  История последних тренировок
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {!hist ? (
                    <p className="text-xs text-muted-foreground pb-2">Загрузка...</p>
                  ) : hist.length === 0 ? (
                    <p className="text-xs text-muted-foreground pb-2">Нет истории</p>
                  ) : (
                    <div className="space-y-1 mb-2">
                      {hist.map((h, i) => (
                        <div key={i} className="flex justify-between text-xs border-b py-1">
                          <span>{formatShortDate(h.started_at)}</span>
                          <span>{h.summary}</span>
                          {h.one_rm && <span className="text-muted-foreground">1RM≈{h.one_rm}кг</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Set rows */}
              <div className="space-y-2">
                {rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6 text-center">{rowIdx + 1}</span>
                    <Input
                      type="number"
                      value={row.weight}
                      onChange={e => updateRow(ex.exercise_id, rowIdx, 'weight', e.target.value)}
                      placeholder="кг"
                      className="flex-1 h-11 text-lg text-center"
                      disabled={row.completed}
                      inputMode="decimal"
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      value={row.reps}
                      onChange={e => updateRow(ex.exercise_id, rowIdx, 'reps', e.target.value)}
                      placeholder="повт."
                      className="flex-1 h-11 text-lg text-center"
                      disabled={row.completed}
                      inputMode="numeric"
                    />
                    <Button
                      variant={row.completed ? 'secondary' : 'default'}
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={row.completed}
                      onClick={() => completeSet(ex.exercise_id, rowIdx, ex.category === 'compound', ex.exercise_name)}
                    >
                      <CheckCircle2 className={`h-5 w-5 ${row.completed ? 'text-green-500' : ''}`} />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1"
                onClick={() => addSetRow(ex.exercise_id, ex.rep_min)}
              >
                <Plus className="h-4 w-4 mr-1" /> Добавить подход
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* FAB */}
      <button
        onClick={() => setPickerOpen(true)}
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-2xl hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      <ExercisePicker
        exercises={allExercises}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />

      {restTimer && (
        <RestTimerOverlay
          isCompound={restTimer.isCompound}
          compoundSeconds={settings.compound_rest_seconds}
          isolationSeconds={settings.isolation_rest_seconds}
          onClose={() => setRestTimer(null)}
        />
      )}
    </div>
  );
}
