'use client';
import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { SessionSet } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface SetEntry {
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  completed: boolean;
  logged_at?: string;
}

interface WorkoutState {
  sessionId: string | null;
  sets: Record<string, SetEntry[]>; // exerciseId -> sets
  saving: boolean;
}

type WorkoutAction =
  | { type: 'INIT'; sessionId: string; existingSets: SessionSet[] }
  | { type: 'UPDATE_SET'; exerciseId: string; setIndex: number; field: keyof SetEntry; value: unknown }
  | { type: 'ADD_SET'; exerciseId: string; exerciseName: string; defaultWeight: number; defaultReps: number }
  | { type: 'COMPLETE_SET'; exerciseId: string; setIndex: number }
  | { type: 'SET_SAVING'; saving: boolean };

function reducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'INIT': {
      const sets: Record<string, SetEntry[]> = {};
      action.existingSets.forEach(s => {
        if (!sets[s.exercise_id]) sets[s.exercise_id] = [];
        sets[s.exercise_id].push({
          exercise_id: s.exercise_id,
          exercise_name: s.exercise_name,
          set_number: s.set_number,
          weight_kg: s.weight_kg,
          reps: s.reps,
          completed: true,
          logged_at: s.logged_at,
        });
      });
      return { ...state, sessionId: action.sessionId, sets };
    }
    case 'UPDATE_SET': {
      const exerciseSets = [...(state.sets[action.exerciseId] || [])];
      exerciseSets[action.setIndex] = { ...exerciseSets[action.setIndex], [action.field]: action.value };
      return { ...state, sets: { ...state.sets, [action.exerciseId]: exerciseSets } };
    }
    case 'ADD_SET': {
      const existing = state.sets[action.exerciseId] || [];
      const newSet: SetEntry = {
        exercise_id: action.exerciseId,
        exercise_name: action.exerciseName,
        set_number: existing.length + 1,
        weight_kg: action.defaultWeight,
        reps: action.defaultReps,
        completed: false,
      };
      return { ...state, sets: { ...state.sets, [action.exerciseId]: [...existing, newSet] } };
    }
    case 'COMPLETE_SET': {
      const exerciseSets = [...(state.sets[action.exerciseId] || [])];
      exerciseSets[action.setIndex] = { ...exerciseSets[action.setIndex], completed: true };
      return { ...state, sets: { ...state.sets, [action.exerciseId]: exerciseSets } };
    }
    case 'SET_SAVING':
      return { ...state, saving: action.saving };
    default:
      return state;
  }
}

interface WorkoutContextValue {
  state: WorkoutState;
  initSession: (sessionId: string, existingSets: SessionSet[]) => void;
  updateSet: (exerciseId: string, setIndex: number, field: keyof SetEntry, value: unknown) => void;
  addSet: (exerciseId: string, exerciseName: string, defaultWeight: number, defaultReps: number) => void;
  completeSet: (exerciseId: string, setIndex: number) => void;
  totalCompletedSets: number;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { sessionId: null, sets: {}, saving: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncToSupabase = useCallback(
    (sessionId: string, sets: Record<string, SetEntry[]>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const allSets = Object.values(sets).flat().filter(s => s.completed);
        for (const s of allSets) {
          await supabase.from('session_sets').upsert(
            {
              session_id: sessionId,
              exercise_id: s.exercise_id,
              exercise_name: s.exercise_name,
              set_number: s.set_number,
              weight_kg: s.weight_kg,
              reps: s.reps,
            },
            { onConflict: 'session_id,exercise_id,set_number' }
          );
        }
      }, 300);
    },
    []
  );

  const initSession = useCallback((sessionId: string, existingSets: SessionSet[]) => {
    dispatch({ type: 'INIT', sessionId, existingSets });
  }, []);

  const updateSet = useCallback(
    (exerciseId: string, setIndex: number, field: keyof SetEntry, value: unknown) => {
      dispatch({ type: 'UPDATE_SET', exerciseId, setIndex, field, value });
    },
    []
  );

  const addSet = useCallback(
    (exerciseId: string, exerciseName: string, defaultWeight: number, defaultReps: number) => {
      dispatch({ type: 'ADD_SET', exerciseId, exerciseName, defaultWeight, defaultReps });
    },
    []
  );

  const completeSet = useCallback(
    (exerciseId: string, setIndex: number) => {
      dispatch({ type: 'COMPLETE_SET', exerciseId, setIndex });
      if (state.sessionId) {
        const newSets = { ...state.sets };
        if (newSets[exerciseId]) {
          const updated = [...newSets[exerciseId]];
          updated[setIndex] = { ...updated[setIndex], completed: true };
          newSets[exerciseId] = updated;
        }
        syncToSupabase(state.sessionId, newSets);
      }
    },
    [state.sessionId, state.sets, syncToSupabase]
  );

  const totalCompletedSets = Object.values(state.sets)
    .flat()
    .filter(s => s.completed).length;

  return (
    <WorkoutContext.Provider value={{ state, initSession, updateSet, addSet, completeSet, totalCompletedSets }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within WorkoutProvider');
  return ctx;
}
