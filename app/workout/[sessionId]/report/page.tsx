import { getSession, getSessionSets } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { WorkoutReportClient } from '@/components/WorkoutReportClient';

export const dynamic = 'force-dynamic';

export default async function WorkoutReportPage({ params }: { params: { sessionId: string } }) {
  const session = await getSession(params.sessionId);
  if (!session) notFound();

  const sets = await getSessionSets(params.sessionId);

  return <WorkoutReportClient session={session} sets={sets} />;
}
