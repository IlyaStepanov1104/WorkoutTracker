export type Category = 'compound' | 'isolation';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  muscle_group: string;
  default_rep_min: number;
  default_rep_max: number;
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  is_custom: boolean;
  created_at: string;
}

export interface PlanExercise {
  id: string;
  plan_id: string;
  exercise_id: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  sort_order: number;
  exercise?: Exercise;
}

export interface Schedule {
  id: string;
  day_of_week: number;
  plan_id: string | null;
  plan?: WorkoutPlan | null;
}

export interface WorkoutSession {
  id: string;
  plan_id: string | null;
  plan_name: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  public_token: string | null;
}

export interface SessionSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  logged_at: string;
  exercise?: Exercise;
}

export interface AppSettings {
  compound_rest_seconds: number;
  isolation_rest_seconds: number;
  compound_weight_increment: number;
  isolation_weight_increment: number;
}

export interface RecommendedWeight {
  weight: number | null;
  rep_min: number;
  rep_max: number;
  one_rm: number | null;
}

export interface ExerciseHistory {
  session_id: string;
  started_at: string;
  sets: SessionSet[];
  summary: string;
  one_rm: number | null;
}
