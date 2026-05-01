'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkoutPlan, WorkoutSession, PlanExercise } from '@/lib/types';
import { formatDate, formatDuration } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dumbbell, Play, Clock, AlertCircle } from 'lucide-react';
import { startSession } from '@/lib/actions';
import { showToast } from '@/components/ui/toast';

interface WeekDay {
  dayOfWeek: number;
  dayName: string;
  plan: WorkoutPlan | null;
  isToday: boolean;
}

interface RecentSession {
  session: WorkoutSession;
  volume: number;
}

interface Props {
  todayPlan: WorkoutPlan | null;
  todayPlanExercises: PlanExercise[];
  activeSession: WorkoutSession | null;
  recentWithVolume: RecentSession[];
  weekDays: WeekDay[];
}

export function DashboardClient({ todayPlan, todayPlanExercises, activeSession, recentWithVolume, weekDays }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart(plan: WorkoutPlan | null) {
    setLoading(true);
    try {
      const session = await startSession(plan?.id ?? null, plan?.name ?? 'Произвольная тренировка');
      router.push(`/workout/${session.id}`);
    } catch {
      showToast('Ошибка при создании тренировки', 'error');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Главная</h1>

      {/* Resume banner */}
      {activeSession && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-sm">Незавершённая тренировка</p>
                <p className="text-xs text-muted-foreground">от {formatDate(activeSession.started_at)}</p>
              </div>
            </div>
            <Link href={`/workout/${activeSession.id}`}>
              <Button size="sm" variant="outline">Продолжить</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Today's workout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Сегодня
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayPlan ? (
            <>
              <div>
                <p className="font-semibold text-lg">{todayPlan.name}</p>
                {todayPlan.description && (
                  <p className="text-sm text-muted-foreground">{todayPlan.description}</p>
                )}
              </div>

              {todayPlanExercises.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    {todayPlanExercises.map((pe, i) => (
                      <div key={pe.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{i + 1}. {pe.exercise?.name ?? '—'}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {pe.sets}×{pe.rep_min}–{pe.rep_max}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={() => handleStart(todayPlan)}
                disabled={loading}
              >
                <Play className="h-4 w-4 mr-2" />
                Начать тренировку
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">Сегодня день отдыха 🛋️</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleStart(null)}
                disabled={loading}
              >
                <Play className="h-4 w-4 mr-2" />
                Начать произвольную тренировку
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Weekly preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ближайшие 7 дней</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDays.map(({ dayOfWeek, dayName, plan, isToday }) => (
              <div
                key={dayOfWeek}
                className={`flex-none flex flex-col items-center gap-1 rounded-lg p-2 min-w-[56px] text-center ${
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}
              >
                <span className="text-xs font-medium">{dayName}</span>
                <span className="text-xs truncate max-w-[48px]">
                  {plan ? plan.name : 'Отдых'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent sessions */}
      {recentWithVolume.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Последние тренировки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentWithVolume.map(({ session, volume }) => (
              <Link key={session.id} href={`/workout/${session.id}/report`}>
                <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors">
                  <div>
                    <p className="font-medium text-sm">{session.plan_name || 'Произвольная'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(session.started_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{Math.round(volume)} кг</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(session.started_at, session.finished_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
