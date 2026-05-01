'use client';
import React, { useState } from 'react';
import { WorkoutPlan } from '@/lib/types';
import { DAY_NAMES_FULL } from '@/lib/utils';
import { updateSchedule } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showToast } from '@/components/ui/toast';
import { Calendar } from 'lucide-react';

interface ScheduleRow {
  id: string;
  day_of_week: number;
  plan_id: string | null;
  plan?: WorkoutPlan | null;
}

interface Props {
  schedule: ScheduleRow[];
  plans: WorkoutPlan[];
}

export function ScheduleClient({ schedule, plans }: Props) {
  const initial: Record<number, string> = {};
  // Mon–Sun order: 1,2,3,4,5,6,0
  const days = [1, 2, 3, 4, 5, 6, 0];

  schedule.forEach(s => { initial[s.day_of_week] = s.plan_id ?? 'rest'; });
  days.forEach(d => { if (!(d in initial)) initial[d] = 'rest'; });

  const [selections, setSelections] = useState<Record<number, string>>(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all(
        days.map(d => updateSchedule(d, selections[d] === 'rest' ? null : selections[d]))
      );
      showToast('Расписание сохранено', 'success');
    } catch {
      showToast('Ошибка при сохранении', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6 text-primary" />
        Расписание
      </h1>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Расписание на неделю</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {days.map(d => (
            <div key={d} className="flex items-center gap-3">
              <span className="w-28 text-sm font-medium">{DAY_NAMES_FULL[d]}</span>
              <Select
                value={selections[d] ?? 'rest'}
                onValueChange={val => setSelections(prev => ({ ...prev, [d]: val }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rest">День отдыха</SelectItem>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить расписание'}
      </Button>
    </div>
  );
}
