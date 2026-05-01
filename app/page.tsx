import { getActiveSession, getRecentSessions, getSchedule, getSessionSets, getPlanWithExercises } from '@/lib/actions';
import { DAY_NAMES, calcVolume } from '@/lib/utils';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const today = new Date().getDay();
  const [schedule, activeSession, recentSessions] = await Promise.all([
    getSchedule(),
    getActiveSession(),
    getRecentSessions(5),
  ]);

  const todaySchedule = schedule.find(s => s.day_of_week === today);
  const todayPlan = todaySchedule?.plan ?? null;

  const [recentWithVolume, todayPlanData] = await Promise.all([
    Promise.all(
      recentSessions.map(async session => {
        const sets = await getSessionSets(session.id);
        return { session, volume: calcVolume(sets) };
      })
    ),
    todayPlan ? getPlanWithExercises(todayPlan.id) : null,
  ]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = (today + i) % 7;
    const s = schedule.find(sc => sc.day_of_week === d);
    return { dayOfWeek: d, dayName: DAY_NAMES[d], plan: s?.plan ?? null, isToday: i === 0 };
  });

  return (
    <DashboardClient
      todayPlan={todayPlan}
      todayPlanExercises={todayPlanData?.exercises ?? []}
      activeSession={activeSession}
      recentWithVolume={recentWithVolume}
      weekDays={weekDays}
    />
  );
}
