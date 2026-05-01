'use client';
import React, { useState, useMemo } from 'react';
import { Exercise } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  exercises: Exercise[];
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}

export function ExercisePicker({ exercises, open, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter(
      e => e.name.toLowerCase().includes(q) || e.muscle_group.toLowerCase().includes(q)
    );
  }, [exercises, search]);

  const compound = filtered.filter(e => e.category === 'compound');
  const isolation = filtered.filter(e => e.category === 'isolation');

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Выбрать упражнение</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <ScrollArea className="h-80">
          {compound.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-1">Базовые</p>
              {compound.map(e => (
                <button
                  key={e.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between"
                  onClick={() => { onSelect(e); onClose(); setSearch(''); }}
                >
                  <span className="font-medium">{e.name}</span>
                  <Badge variant="secondary" className="text-xs">{e.muscle_group}</Badge>
                </button>
              ))}
            </div>
          )}
          {isolation.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 px-1">Изолирующие</p>
              {isolation.map(e => (
                <button
                  key={e.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent flex items-center justify-between"
                  onClick={() => { onSelect(e); onClose(); setSearch(''); }}
                >
                  <span className="font-medium">{e.name}</span>
                  <Badge variant="secondary" className="text-xs">{e.muscle_group}</Badge>
                </button>
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Упражнения не найдены</p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
