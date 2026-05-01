'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WorkoutPlan, PlanExercise } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus } from 'lucide-react';
import { deletePlan, createPlan } from '@/lib/actions';
import { showToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PlanWithExercises {
  plan: WorkoutPlan;
  exercises: PlanExercise[];
}

interface Props {
  plansWithExercises: PlanWithExercises[];
}

export function PlansClient({ plansWithExercises }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const plan = await createPlan(newName.trim(), newDesc.trim());
      setCreating(false);
      setNewName('');
      setNewDesc('');
      router.push(`/plans/${plan.id}/edit`);
    } catch {
      showToast('Ошибка при создании плана', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(planId: string) {
    setDeleting(planId);
    try {
      await deletePlan(planId);
      router.refresh();
      showToast('План удалён', 'success');
    } catch {
      showToast('Ошибка при удалении', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Планы тренировок</h1>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Создать
        </Button>
      </div>

      {plansWithExercises.map(({ plan, exercises }) => (
        <Card key={plan.id}>
          <Collapsible open={open === plan.id} onOpenChange={v => setOpen(v ? plan.id : null)}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {open === plan.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={plan.is_custom ? 'default' : 'secondary'}>
                      {plan.is_custom ? 'Своя' : 'Базовая'}
                    </Badge>
                    {plan.is_custom && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Link href={`/plans/${plan.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={deleting === plan.id}
                          onClick={() => handleDelete(plan.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {exercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Упражнения не добавлены</p>
                ) : (
                  <div className="space-y-1">
                    {exercises.map((pe, i) => (
                      <div key={pe.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                          <div>
                            <p className="text-sm font-medium">{pe.exercise?.name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{pe.exercise?.muscle_group}</p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {pe.sets}×{pe.rep_min}–{pe.rep_max}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Новый план</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Например: PPL"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Описание (необязательно)</Label>
              <Input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Краткое описание"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setCreating(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
              {saving ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
