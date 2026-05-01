'use client';
import React from 'react';
import { useTimer } from '@/hooks/useTimer';
import { beep } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface Props {
  isCompound: boolean;
  compoundSeconds: number;
  isolationSeconds: number;
  onClose: () => void;
}

export function RestTimerOverlay({ isCompound, compoundSeconds, isolationSeconds, onClose }: Props) {
  const totalSeconds = isCompound ? compoundSeconds : isolationSeconds;
  const { seconds, adjust, skip, progress } = useTimer(totalSeconds, () => {
    beep();
    setTimeout(onClose, 1500);
  });

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (100 - progress) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl p-8 mx-4 w-full max-w-sm text-center shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Отдых</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Circular progress */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg width="140" height="140" className="-rotate-90">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={radius} fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute text-4xl font-bold font-mono">{seconds}</span>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {isCompound ? 'Базовое упражнение' : 'Изолирующее упражнение'}
        </p>

        <div className="flex gap-3 justify-center mb-4">
          <Button variant="outline" size="sm" onClick={() => adjust(-15)}>−15с</Button>
          <Button variant="outline" size="sm" onClick={() => adjust(15)}>+15с</Button>
        </div>

        <Button variant="secondary" className="w-full" onClick={skip}>Пропустить</Button>
      </div>
    </div>
  );
}
