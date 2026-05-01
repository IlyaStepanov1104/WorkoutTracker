import { getActiveSession, getRecentSessions, getSchedule, getSessionSets } from '@/lib/actions';
import { DAY_NAMES, calcVolume } from '@/lib/utils';
import { DashboardClient } from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const today = new Date().getDay(); // 0=Sun...6=Sat
  const [schedule, activeSession, recentSessions] = await Promise.all([
    getSchedule(),
    getActiveSession(),
    getRecentSessions(5),
  ]);

  const todaySchedule = schedule.find(s => s.day_of_week === today);
  const todayPlan = todaySchedule?.plan ?? null;

  const recentWithVolume = await Promise.all(
    recentSessions.map(async session => {
      const sets = await getSessionSets(session.id);
      const volume = calcVolume(sets);
      return { session, volume };
    })
  );

  // Build 7-day preview starting from today
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = (today + i) % 7;
    const s = schedule.find(sc => sc.day_of_week === d);
    return { dayOfWeek: d, dayName: DAY_NAMES[d], plan: s?.plan ?? null, isToday: i === 0 };
  });

  return (
    <DashboardClient
      todayPlan={todayPlan}
      activeSession={activeSession}
      recentWithVolume={recentWithVolume}
      weekDays={weekDays}
    />
  );
}
