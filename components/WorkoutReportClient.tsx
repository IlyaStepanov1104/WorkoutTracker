'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { WorkoutSession, SessionSet } from '@/lib/types';
import { formatDate, formatDuration, calcVolume, calcEpley1RM } from '@/lib/utils';
import { updateSessionNotes, generatePublicToken } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Home, Share2, Clock, Dumbbell } from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface Props {
  session: WorkoutSession;
  sets: SessionSet[];
  readOnly?: boolean;
}

interface ExerciseSummary {
  exercise_id: string;
  exercise_name: string;
  category: string;
  sets_count: number;
  best_weight: number;
  total_volume: number;
  one_rm: number | null;
  is_pr: boolean;
}

export function WorkoutReportClient({ session, sets, readOnly = false }: Props) {
  const [notes, setNotes] = useState(session.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const saveTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalVolume = calcVolume(sets);
  const duration = formatDuration(session.started_at, session.finished_at);

  // Group sets by exercise
  const exerciseMap = new Map<string, SessionSet[]>();
  sets.forEach(s => {
    if (!exerciseMap.has(s.exercise_id)) exerciseMap.set(s.exercise_id, []);
    exerciseMap.get(s.exercise_id)!.push(s);
  });

  const exerciseSummaries: ExerciseSummary[] = Array.from(exerciseMap.entries()).map(([id, exSets]) => {
    const bestSet = exSets.reduce((best, s) => s.weight_kg > best.weight_kg ? s : best, exSets[0]);
    const one_rm = exSets[0]?.exercise?.category === 'compound'
      ? calcEpley1RM(bestSet.weight_kg, bestSet.reps)
      : null;
    return {
      exercise_id: id,
      exercise_name: exSets[0].exercise_name,
      category: exSets[0].exercise?.category ?? 'compound',
      sets_count: exSets.length,
      best_weight: bestSet.weight_kg,
      total_volume: calcVolume(exSets),
      one_rm,
      is_pr: false, // would need all-time history to determine
    };
  });

  function handleNotesChange(val: string) {
    setNotes(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      try { await updateSessionNotes(session.id, val); }
      finally { setSaving(false); }
    }, 800);
  }

  async function handleShare() {
    setSharing(true);
    try {
      const token = session.public_token ?? await generatePublicToken(session.id);
      const url = `${window.location.origin}/report/${token}`;
      await navigator.clipboard.writeText(url);
      showToast('Ссылка скопирована в буфер', 'success');
    } catch {
      showToast('Ошибка при генерации ссылки', 'error');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Итоги тренировки</h1>
        {!readOnly && (
          <Link href="/">
            <Button variant="ghost" size="sm"><Home className="h-4 w-4 mr-1" /> Главная</Button>
          </Link>
        )}
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="font-semibold">{session.plan_name || 'Произвольная тренировка'}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Дата</p>
              <p className="font-semibold text-sm">{formatDate(session.started_at)}</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Длительность</p>
              <p className="font-semibold text-sm flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />{duration}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Объём</p>
              <p className="font-semibold text-sm">{Math.round(totalVolume)} кг</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Упражнения</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {exerciseSummaries.map(ex => (
            <div key={ex.exercise_id} className="border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ex.exercise_name}</span>
                  {ex.is_pr && (
                    <Badge className="text-xs bg-yellow-500 text-yellow-50">🏆 PR</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">{ex.sets_count} подх.</span>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Лучший: {ex.best_weight} кг</span>
                <span>Объём: {Math.round(ex.total_volume)} кг</span>
                {ex.one_rm && <span>1RM≈{ex.one_rm} кг</span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      {!readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Заметки</CardTitle>
              {saving && <span className="text-xs text-muted-foreground">Сохранение...</span>}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Как прошла тренировка?"
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {readOnly && session.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Заметки</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{session.notes}</p></CardContent>
        </Card>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleShare}
            disabled={sharing}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {sharing ? 'Генерация...' : 'Поделиться'}
          </Button>
          <Link href="/" className="flex-1">
            <Button className="w-full">
              <Home className="h-4 w-4 mr-2" /> На главную
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
