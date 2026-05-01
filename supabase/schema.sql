-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- exercises
CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('compound', 'isolation')),
  muscle_group text NOT NULL,
  default_rep_min int NOT NULL DEFAULT 8,
  default_rep_max int NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- workout_plans
CREATE TABLE workout_plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- plan_exercises
CREATE TABLE plan_exercises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  sets int NOT NULL DEFAULT 3,
  rep_min int NOT NULL DEFAULT 8,
  rep_max int NOT NULL DEFAULT 12,
  sort_order int NOT NULL DEFAULT 0
);

-- schedule
CREATE TABLE schedule (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_of_week int NOT NULL UNIQUE CHECK (day_of_week BETWEEN 0 AND 6),
  plan_id uuid REFERENCES workout_plans(id) ON DELETE SET NULL
);

-- workout_sessions
CREATE TABLE workout_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id uuid REFERENCES workout_plans(id) ON DELETE SET NULL,
  plan_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  notes text,
  public_token text UNIQUE
);

-- session_sets
CREATE TABLE session_sets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES exercises(id),
  exercise_name text NOT NULL,
  set_number int NOT NULL,
  weight_kg numeric(5,2) NOT NULL,
  reps int NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, exercise_id, set_number)
);

-- settings
CREATE TABLE settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

-- RLS: disable or permissive policies (no auth)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_exercises" ON exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_workout_plans" ON workout_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_plan_exercises" ON plan_exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_schedule" ON schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_workout_sessions" ON workout_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_session_sets" ON session_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- =====================
-- SEED DATA
-- =====================

-- Exercises
INSERT INTO exercises (name, category, muscle_group, default_rep_min, default_rep_max) VALUES
  ('Bench Press', 'compound', 'Грудь', 5, 8),
  ('Overhead Press', 'compound', 'Плечи', 5, 8),
  ('Incline Dumbbell Press', 'compound', 'Грудь', 8, 12),
  ('Pull-ups / Lat Pulldown', 'compound', 'Спина', 5, 8),
  ('Barbell Row', 'compound', 'Спина', 5, 8),
  ('Cable Row', 'compound', 'Спина', 8, 12),
  ('Squat', 'compound', 'Ноги', 5, 8),
  ('Romanian Deadlift', 'compound', 'Ноги', 8, 12),
  ('Leg Press', 'compound', 'Ноги', 10, 15),
  ('Deadlift', 'compound', 'Спина', 5, 8),
  ('Lateral Raise', 'isolation', 'Плечи', 10, 15),
  ('Tricep Pushdown', 'isolation', 'Трицепс', 10, 15),
  ('Skull Crushers', 'isolation', 'Трицепс', 10, 15),
  ('Face Pull', 'isolation', 'Плечи', 12, 15),
  ('Barbell Curl', 'isolation', 'Бицепс', 10, 15),
  ('Hammer Curl', 'isolation', 'Бицепс', 10, 15),
  ('Leg Curl', 'isolation', 'Ноги', 10, 15),
  ('Leg Extension', 'isolation', 'Ноги', 10, 15),
  ('Calf Raise', 'isolation', 'Ноги', 12, 15);

-- Plans
WITH plan_push AS (
  INSERT INTO workout_plans (name, description, is_custom) VALUES ('Push', 'Грудь, плечи, трицепс', false) RETURNING id
),
plan_pull AS (
  INSERT INTO workout_plans (name, description, is_custom) VALUES ('Pull', 'Спина, бицепс', false) RETURNING id
),
plan_legs AS (
  INSERT INTO workout_plans (name, description, is_custom) VALUES ('Legs', 'Ноги', false) RETURNING id
),
plan_upper AS (
  INSERT INTO workout_plans (name, description, is_custom) VALUES ('Upper', 'Верх тела', false) RETURNING id
),
plan_lower AS (
  INSERT INTO workout_plans (name, description, is_custom) VALUES ('Lower', 'Низ тела', false) RETURNING id
),
plan_fullbody AS (
  INSERT INTO workout_plans (name, description, is_custom) VALUES ('Full Body', 'Всё тело', false) RETURNING id
)
SELECT 1;

-- We'll use a DO block to insert plan_exercises with exercise lookups
DO $$
DECLARE
  pid_push uuid;
  pid_pull uuid;
  pid_legs uuid;
  pid_upper uuid;
  pid_lower uuid;
  pid_fullbody uuid;
  eid_bench uuid;
  eid_ohp uuid;
  eid_incline uuid;
  eid_pullup uuid;
  eid_row uuid;
  eid_cable_row uuid;
  eid_squat uuid;
  eid_rdl uuid;
  eid_leg_press uuid;
  eid_deadlift uuid;
  eid_lateral uuid;
  eid_pushdown uuid;
  eid_skulls uuid;
  eid_facepull uuid;
  eid_bbcurl uuid;
  eid_hammer uuid;
  eid_leg_curl uuid;
  eid_leg_ext uuid;
  eid_calf uuid;
BEGIN
  SELECT id INTO pid_push FROM workout_plans WHERE name = 'Push' AND is_custom = false LIMIT 1;
  SELECT id INTO pid_pull FROM workout_plans WHERE name = 'Pull' AND is_custom = false LIMIT 1;
  SELECT id INTO pid_legs FROM workout_plans WHERE name = 'Legs' AND is_custom = false LIMIT 1;
  SELECT id INTO pid_upper FROM workout_plans WHERE name = 'Upper' AND is_custom = false LIMIT 1;
  SELECT id INTO pid_lower FROM workout_plans WHERE name = 'Lower' AND is_custom = false LIMIT 1;
  SELECT id INTO pid_fullbody FROM workout_plans WHERE name = 'Full Body' AND is_custom = false LIMIT 1;

  SELECT id INTO eid_bench FROM exercises WHERE name = 'Bench Press' LIMIT 1;
  SELECT id INTO eid_ohp FROM exercises WHERE name = 'Overhead Press' LIMIT 1;
  SELECT id INTO eid_incline FROM exercises WHERE name = 'Incline Dumbbell Press' LIMIT 1;
  SELECT id INTO eid_pullup FROM exercises WHERE name = 'Pull-ups / Lat Pulldown' LIMIT 1;
  SELECT id INTO eid_row FROM exercises WHERE name = 'Barbell Row' LIMIT 1;
  SELECT id INTO eid_cable_row FROM exercises WHERE name = 'Cable Row' LIMIT 1;
  SELECT id INTO eid_squat FROM exercises WHERE name = 'Squat' LIMIT 1;
  SELECT id INTO eid_rdl FROM exercises WHERE name = 'Romanian Deadlift' LIMIT 1;
  SELECT id INTO eid_leg_press FROM exercises WHERE name = 'Leg Press' LIMIT 1;
  SELECT id INTO eid_deadlift FROM exercises WHERE name = 'Deadlift' LIMIT 1;
  SELECT id INTO eid_lateral FROM exercises WHERE name = 'Lateral Raise' LIMIT 1;
  SELECT id INTO eid_pushdown FROM exercises WHERE name = 'Tricep Pushdown' LIMIT 1;
  SELECT id INTO eid_skulls FROM exercises WHERE name = 'Skull Crushers' LIMIT 1;
  SELECT id INTO eid_facepull FROM exercises WHERE name = 'Face Pull' LIMIT 1;
  SELECT id INTO eid_bbcurl FROM exercises WHERE name = 'Barbell Curl' LIMIT 1;
  SELECT id INTO eid_hammer FROM exercises WHERE name = 'Hammer Curl' LIMIT 1;
  SELECT id INTO eid_leg_curl FROM exercises WHERE name = 'Leg Curl' LIMIT 1;
  SELECT id INTO eid_leg_ext FROM exercises WHERE name = 'Leg Extension' LIMIT 1;
  SELECT id INTO eid_calf FROM exercises WHERE name = 'Calf Raise' LIMIT 1;

  -- Push plan
  INSERT INTO plan_exercises (plan_id, exercise_id, sets, rep_min, rep_max, sort_order) VALUES
    (pid_push, eid_bench, 4, 5, 8, 0),
    (pid_push, eid_ohp, 3, 5, 8, 1),
    (pid_push, eid_incline, 3, 8, 12, 2),
    (pid_push, eid_lateral, 3, 12, 15, 3),
    (pid_push, eid_pushdown, 3, 10, 15, 4),
    (pid_push, eid_skulls, 3, 10, 15, 5);

  -- Pull plan
  INSERT INTO plan_exercises (plan_id, exercise_id, sets, rep_min, rep_max, sort_order) VALUES
    (pid_pull, eid_pullup, 4, 5, 8, 0),
    (pid_pull, eid_row, 3, 5, 8, 1),
    (pid_pull, eid_cable_row, 3, 8, 12, 2),
    (pid_pull, eid_facepull, 3, 12, 15, 3),
    (pid_pull, eid_bbcurl, 3, 10, 15, 4),
    (pid_pull, eid_hammer, 3, 10, 15, 5);

  -- Legs plan
  INSERT INTO plan_exercises (plan_id, exercise_id, sets, rep_min, rep_max, sort_order) VALUES
    (pid_legs, eid_squat, 4, 5, 8, 0),
    (pid_legs, eid_rdl, 3, 8, 12, 1),
    (pid_legs, eid_leg_press, 3, 10, 15, 2),
    (pid_legs, eid_leg_curl, 3, 10, 15, 3),
    (pid_legs, eid_leg_ext, 3, 10, 15, 4),
    (pid_legs, eid_calf, 4, 12, 15, 5);

  -- Upper plan
  INSERT INTO plan_exercises (plan_id, exercise_id, sets, rep_min, rep_max, sort_order) VALUES
    (pid_upper, eid_bench, 4, 5, 8, 0),
    (pid_upper, eid_row, 3, 5, 8, 1),
    (pid_upper, eid_ohp, 3, 5, 8, 2),
    (pid_upper, eid_pullup, 3, 8, 12, 3),
    (pid_upper, eid_lateral, 3, 12, 15, 4),
    (pid_upper, eid_bbcurl, 3, 10, 15, 5);

  -- Lower plan
  INSERT INTO plan_exercises (plan_id, exercise_id, sets, rep_min, rep_max, sort_order) VALUES
    (pid_lower, eid_squat, 4, 5, 8, 0),
    (pid_lower, eid_rdl, 3, 8, 12, 1),
    (pid_lower, eid_leg_press, 3, 10, 15, 2),
    (pid_lower, eid_leg_curl, 3, 10, 15, 3),
    (pid_lower, eid_calf, 3, 12, 15, 4);

  -- Full Body plan
  INSERT INTO plan_exercises (plan_id, exercise_id, sets, rep_min, rep_max, sort_order) VALUES
    (pid_fullbody, eid_squat, 4, 5, 8, 0),
    (pid_fullbody, eid_bench, 3, 5, 8, 1),
    (pid_fullbody, eid_row, 3, 8, 12, 2),
    (pid_fullbody, eid_ohp, 3, 8, 12, 3),
    (pid_fullbody, eid_rdl, 3, 8, 12, 4);

  -- Default schedule: Mon=Push, Wed=Pull, Fri=Legs
  INSERT INTO schedule (day_of_week, plan_id) VALUES
    (1, pid_push),
    (3, pid_pull),
    (5, pid_legs);

  -- Default settings
  INSERT INTO settings (key, value) VALUES
    ('compound_rest_seconds', '90'),
    ('isolation_rest_seconds', '60'),
    ('compound_weight_increment', '2.5'),
    ('isolation_weight_increment', '1.25');
END $$;
