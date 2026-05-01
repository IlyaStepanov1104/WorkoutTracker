'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Exercise, PlanExercise, WorkoutPlan } from '@/lib/types';
import { updatePlan, updatePlanExercises } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Trash2, Plus, Save, ArrowLeft } from 'lucide-react';
import { ExercisePicker } from '@/components/ExercisePicker';
import { showToast } from '@/components/ui/toast';
import Link from 'next/link';

interface EditablePlanExercise {
  tempId: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  sets: number;
  rep_min: number;
  rep_max: number;
}

interface SortableItemProps {
  item: EditablePlanExercise;
  onChange: (field: keyof EditablePlanExercise, value: unknown) => void;
  onRemove: () => void;
}

function SortableItem({ item, onChange, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.tempId });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 border rounded-md bg-card">
      <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm font-medium truncate">{item.exercise_name}</span>
          <Badge variant="secondary" className="text-xs shrink-0">{item.muscle_group}</Badge>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Подходы</label>
            <Input
              type="number"
              value={item.sets}
              onChange={e => onChange('sets', Number(e.target.value))}
              className="h-8 text-sm"
              min={1} max={10}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Мин.повт.</label>
            <Input
              type="number"
              value={item.rep_min}
              onChange={e => onChange('rep_min', Number(e.target.value))}
              className="h-8 text-sm"
              min={1}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Макс.повт.</label>
            <Input
              type="number"
              value={item.rep_max}
              onChange={e => onChange('rep_max', Number(e.target.value))}
              className="h-8 text-sm"
              min={1}
            />
          </div>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface Props {
  plan: WorkoutPlan;
  initialExercises: PlanExercise[];
  allExercises: Exercise[];
}

export function PlanEditorClient({ plan, initialExercises, allExercises }: Props) {
  const router = useRouter();
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? '');
  const [items, setItems] = useState<EditablePlanExercise[]>(
    initialExercises.map(pe => ({
      tempId: pe.id,
      exercise_id: pe.exercise_id,
      exercise_name: pe.exercise?.name ?? '',
      muscle_group: pe.exercise?.muscle_group ?? '',
      sets: pe.sets,
      rep_min: pe.rep_min,
      rep_max: pe.rep_max,
    }))
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIndex = prev.findIndex(i => i.tempId === active.id);
        const newIndex = prev.findIndex(i => i.tempId === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function addExercise(exercise: Exercise) {
    setItems(prev => [
      ...prev,
      {
        tempId: `temp_${Date.now()}_${Math.random()}`,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets: 3,
        rep_min: exercise.default_rep_min,
        rep_max: exercise.default_rep_max,
      },
    ]);
  }

  function updateItem(index: number, field: keyof EditablePlanExercise, value: unknown) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function handleSave() {
    if (!name.trim()) { showToast('Введите название плана', 'error'); return; }
    setSaving(true);
    try {
      await updatePlan(plan.id, name.trim(), description.trim());
      await updatePlanExercises(
        plan.id,
        items.map((item, i) => ({
          plan_id: plan.id,
          exercise_id: item.exercise_id,
          sets: item.sets,
          rep_min: item.rep_min,
          rep_max: item.rep_max,
          sort_order: i,
        }))
      );
      showToast('План сохранён', 'success');
      router.push('/plans');
    } catch {
      showToast('Ошибка при сохранении', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/plans">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold">Редактор плана</h1>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Описание</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="mt-1" placeholder="Необязательно" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Упражнения</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет упражнений. Нажмите «Добавить».
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.tempId)} strategy={verticalListSortingStrategy}>
              {items.map((item, index) => (
                <SortableItem
                  key={item.tempId}
                  item={item}
                  onChange={(field, value) => updateItem(index, field, value)}
                  onRemove={() => setItems(prev => prev.filter((_, i) => i !== index))}
                />
              ))}
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Link href="/plans" className="flex-1">
          <Button variant="outline" className="w-full">Отмена</Button>
        </Link>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      <ExercisePicker
        exercises={allExercises}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />
    </div>
  );
}
