'use client';
import { useState, useEffect, useCallback } from 'react';

export function useWeightUnit() {
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');

  useEffect(() => {
    const stored = localStorage.getItem('weight_unit');
    if (stored === 'lbs') setUnit('lbs');
  }, []);

  const toggle = useCallback(() => {
    setUnit(prev => {
      const next = prev === 'kg' ? 'lbs' : 'kg';
      localStorage.setItem('weight_unit', next);
      return next;
    });
  }, []);

  const display = useCallback(
    (kg: number) => {
      if (unit === 'lbs') return `${Math.round(kg * 2.20462 * 4) / 4} фунт`;
      return `${kg} кг`;
    },
    [unit]
  );

  return { unit, toggle, display };
}
