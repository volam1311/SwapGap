import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'gapswap.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  university TEXT DEFAULT '',
  course TEXT DEFAULT '',
  course_code TEXT DEFAULT '',
  avatar_color TEXT DEFAULT '#7c5cbf',
  learning_style TEXT DEFAULT 'examples',
  preference TEXT DEFAULT 'online',
  availability TEXT DEFAULT '[]',
  teachable TEXT DEFAULT '[]',
  subjects TEXT DEFAULT '[]',
  bio TEXT DEFAULT '',
  onboarded INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  privacy_hide_contact INTEGER DEFAULT 1,
  reliability REAL DEFAULT 4.8,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  course_code TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  on_gps INTEGER DEFAULT 0,
  prereq_id TEXT
);

CREATE TABLE IF NOT EXISTS user_concepts (
  user_id TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence TEXT DEFAULT '',
  evidence TEXT DEFAULT '',
  verified INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS diagnostics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_code TEXT DEFAULT 'IFB104',
  mode TEXT DEFAULT 'stuck',
  question TEXT DEFAULT '',
  working TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  conversation TEXT DEFAULT '[]',
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 3,
  status TEXT DEFAULT 'in_progress',
  result TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  partner_id TEXT,
  mode TEXT DEFAULT 'swap',
  gap_concept TEXT DEFAULT '',
  teach_concept TEXT DEFAULT '',
  score INTEGER DEFAULT 0,
  reasons TEXT DEFAULT '[]',
  status TEXT DEFAULT 'suggested',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  match_id TEXT,
  host_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  gap_concept TEXT DEFAULT '',
  teach_concept TEXT DEFAULT '',
  starts_at TEXT NOT NULL,
  duration_min INTEGER DEFAULT 20,
  format TEXT DEFAULT 'online',
  meeting_url TEXT DEFAULT '',
  agenda TEXT DEFAULT '[]',
  notes_shared TEXT DEFAULT '',
  workspace TEXT DEFAULT '{}',
  status TEXT DEFAULT 'scheduled',
  role_phase TEXT DEFAULT 'a_teaches',
  reminder_min INTEGER DEFAULT 15,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_notes (
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  private_notes TEXT DEFAULT '',
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  user_id TEXT NOT NULL,
  items TEXT DEFAULT '[]',
  answers TEXT DEFAULT '[]',
  score INTEGER DEFAULT 0,
  misconception_corrected INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  helpfulness INTEGER DEFAULT 5,
  clarity INTEGER DEFAULT 5,
  reliability INTEGER DEFAULT 5,
  respectfulness INTEGER DEFAULT 5,
  goal_achieved INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  concept TEXT DEFAULT '',
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  status TEXT DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS match_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  concept TEXT DEFAULT '',
  mode TEXT DEFAULT 'swap',
  created_at TEXT NOT NULL
);
`)

export function nowIso() {
  return new Date().toISOString()
}

export function parseJson(value, fallback) {
  if (value == null || value === '') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.privacy_hide_contact ? undefined : row.email,
    university: row.university,
    course: row.course,
    courseCode: row.course_code,
    avatarColor: row.avatar_color,
    learningStyle: row.learning_style,
    preference: row.preference,
    availability: parseJson(row.availability, []),
    teachable: parseJson(row.teachable, []),
    subjects: parseJson(row.subjects, []),
    bio: row.bio,
    onboarded: Boolean(row.onboarded),
    verified: Boolean(row.verified),
    reliability: row.reliability,
    initial: row.name?.trim()?.[0]?.toUpperCase() || 'S',
  }
}

export function meUser(row) {
  if (!row) return null
  return {
    ...publicUser({ ...row, privacy_hide_contact: 0 }),
    email: row.email,
    privacyHideContact: Boolean(row.privacy_hide_contact),
  }
}
