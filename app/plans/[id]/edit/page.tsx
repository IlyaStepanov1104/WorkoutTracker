import { getPlanWithExercises, getExercises } from '@/lib/actions';
import { notFound } from 'next/navigation';
import { PlanEditorClient } from '@/components/PlanEditorClient';

export const dynamic = 'force-dynamic';

export default async function PlanEditPage({ params }: { params: { id: string } }) {
  const [result, exercises] = await Promise.all([
    getPlanWithExercises(params.id),
    getExercises(),
  ]);

  if (!result) notFound();

  return <PlanEditorClient plan={result.plan} initialExercises={result.exercises} allExercises={exercises} />;
}
