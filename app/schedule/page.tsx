import { getSchedule, getPlans } from '@/lib/actions';
import { ScheduleClient } from '@/components/ScheduleClient';

export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const [schedule, plans] = await Promise.all([getSchedule(), getPlans()]);
  return <ScheduleClient schedule={schedule} plans={plans} />;
}
