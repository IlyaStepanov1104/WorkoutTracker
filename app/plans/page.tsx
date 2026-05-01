import { getPlans, getPlanWithExercises } from '@/lib/actions';
import { PlansClient } from '@/components/PlansClient';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  const plans = await getPlans();
  const plansWithExercises = await Promise.all(
    plans.map(p => getPlanWithExercises(p.id))
  );
  const filtered = plansWithExercises.filter((p): p is NonNullable<typeof p> => p !== null);
  return <PlansClient plansWithExercises={filtered} />;
}
