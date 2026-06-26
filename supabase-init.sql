-- ============================================================
-- Basketball Attendance System — Supabase Init SQL
-- Run this once in Supabase → SQL Editor → Run
-- ============================================================

-- Users (coaches + head coach)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coach',
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  age_category TEXT,
  coach_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  position TEXT,
  jersey_number INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Training sessions
CREATE TABLE IF NOT EXISTS training_sessions (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Attendance per player per session
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'present',
  note TEXT,
  CONSTRAINT uq_attendance_session_player UNIQUE (session_id, player_id)
);

-- Evaluation criteria (e.g. مهارة، التزام)
CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Player evaluation scores per session + criterion
CREATE TABLE IF NOT EXISTS evaluations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  note TEXT,
  CONSTRAINT uq_eval_session_player_criterion UNIQUE (session_id, player_id, criterion_id)
);

-- ============================================================
-- Seed: default accounts
-- Passwords are bcrypt hashed (cost 10)
-- head    → admin123
-- coach1  → coach123
-- coach2  → coach123
-- ============================================================

INSERT INTO users (username, full_name, password_hash, role, is_active) VALUES
  ('head',   'رئيس جهاز كرة السلة', '$2b$10$aTPdMGSUbaFN3/vfRSi8J.HgVL0FVeV9W2IHQnVO/h5kaD4Z9iUSW', 'head_coach', true),
  ('coach1', 'أحمد محمد',            '$2b$10$OK9DanDp9E6UN9jROOf6o.LTYbK7AFXY.qYc.ds53CfisT..rs5gG', 'coach',      true),
  ('coach2', 'خالد علي',             '$2b$10$OK9DanDp9E6UN9jROOf6o.LTYbK7AFXY.qYc.ds53CfisT..rs5gG', 'coach',      true)
ON CONFLICT (username) DO NOTHING;

-- Seed: default evaluation criteria
INSERT INTO evaluation_criteria (name, description, is_active) VALUES
  ('مهارة',       'المهارة الفنية في الأداء',    true),
  ('التزام',      'الالتزام والانضباط',            true),
  ('تفاعل',       'التفاعل مع الفريق',            true),
  ('لياقة بدنية', 'مستوى اللياقة البدنية',        true)
ON CONFLICT (name) DO NOTHING;

-- Seed: sample teams (optional)
INSERT INTO teams (name, age_category, coach_id)
SELECT 'فريق الناشئين أ', 'U14', id FROM users WHERE username = 'coach1';

INSERT INTO teams (name, age_category, coach_id)
SELECT 'فريق الشباب ب', 'U18', id FROM users WHERE username = 'coach2';

INSERT INTO teams (name, age_category, coach_id) VALUES ('فريق الكبار', 'سنيور', NULL);
