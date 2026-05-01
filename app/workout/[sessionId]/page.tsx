import { getSession, getSessionSets, getPlanWithExercises, getExercises, getSettings } from '@/lib/actions';
import { notFound, redirect } from 'next/navigation';
import { WorkoutPageClient } from '@/components/WorkoutPageClient';

export const dynamic = 'force-dynamic';

export default async function WorkoutPage({ params }: { params: { sessionId: string } }) {
  const session = await getSession(params.sessionId);
  if (!session) notFound();
  if (session.finished_at) redirect(`/workout/${params.sessionId}/report`);

  const [existingSets, allExercises, settings] = await Promise.all([
    getSessionSets(params.sessionId),
    getExercises(),
    getSettings(),
  ]);

  let planExercises: Awaited<ReturnType<typeof getPlanWithExercises>> = null;
  if (session.plan_id) {
    planExercises = await getPlanWithExercises(session.plan_id);
  }

  return (
    <WorkoutPageClient
      session={session}
      initialSets={existingSets}
      planExercises={planExercises?.exercises ?? []}
      allExercises={allExercises}
      settings={settings}
    />
  );
}
