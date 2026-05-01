import { getSessionByToken, getSessionSets } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { WorkoutReportClient } from '@/components/WorkoutReportClient';

export const dynamic = 'force-dynamic';

export default async function PublicReportPage({ params }: { params: { token: string } }) {
  const session = await getSessionByToken(params.token);
  if (!session) notFound();

  const sets = await getSessionSets(session.id);

  return (
    <div>
      <div className="mb-4 text-center text-sm text-muted-foreground">📖 Публичный отчёт</div>
      <WorkoutReportClient session={session} sets={sets} readOnly={true} />
    </div>
  );
}
