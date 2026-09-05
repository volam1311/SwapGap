import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import { db, nowIso } from './db.js'
import { FALLBACK_DIAGNOSIS } from './services/fallback.js'

const CONCEPTS = [
  { id: 'variables', name: 'Variables', order: 1, gps: 1, prereq: null },
  { id: 'functions', name: 'Functions', order: 2, gps: 1, prereq: 'variables' },
  { id: 'loops', name: 'Loops', order: 3, gps: 1, prereq: 'functions' },
  { id: 'nested-loops', name: 'Nested loops', order: 4, gps: 1, prereq: 'loops' },
  { id: 'lists', name: 'Lists', order: 5, gps: 1, prereq: 'nested-loops' },
  { id: 'strings', name: 'Strings', order: 6, gps: 0, prereq: 'variables' },
  { id: 'booleans', name: 'Booleans', order: 7, gps: 0, prereq: 'variables' },
  { id: 'operators', name: 'Operators', order: 8, gps: 0, prereq: 'variables' },
  { id: 'conditionals', name: 'Conditionals', order: 9, gps: 0, prereq: 'booleans' },
  { id: 'io', name: 'Input / Output', order: 10, gps: 0, prereq: 'variables' },
  { id: 'comments', name: 'Comments', order: 11, gps: 0, prereq: null },
  { id: 'data-types', name: 'Data types', order: 12, gps: 0, prereq: 'variables' },
  { id: 'assignment', name: 'Assignment', order: 13, gps: 0, prereq: 'variables' },
  { id: 'indentation', name: 'Indentation', order: 14, gps: 0, prereq: 'variables' },
  { id: 'print', name: 'Print statements', order: 15, gps: 0, prereq: 'io' },
  { id: 'return-values', name: 'Return values', order: 16, gps: 0, prereq: 'functions' },
  { id: 'scope', name: 'Scope', order: 17, gps: 0, prereq: 'functions' },
  { id: 'while-loops', name: 'While loops', order: 18, gps: 0, prereq: 'loops' },
  { id: 'accumulators', name: 'Accumulators', order: 19, gps: 0, prereq: 'loops' },
  { id: 'tracing', name: 'Tracing', order: 20, gps: 0, prereq: 'loops' },
  { id: 'loop-reset', name: 'Loop reset', order: 21, gps: 0, prereq: 'nested-loops' },
  { id: 'off-by-one', name: 'Off-by-one', order: 22, gps: 0, prereq: 'loops' },
]

const MASTERED = [
  'variables',
  'functions',
  'strings',
  'booleans',
  'operators',
  'conditionals',
  'io',
  'comments',
  'data-types',
  'assignment',
  'indentation',
  'print',
]
const DEVELOPING = ['loops', 'while-loops', 'accumulators', 'tracing']
const GAPS = ['nested-loops', 'loop-reset', 'off-by-one']

function slot(daysFromToday, hour, minute) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function weekdayLabel(daysFromToday, timeLabel) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  if (daysFromToday === 0) return `Today — ${timeLabel}`
  if (daysFromToday === 1) return `Tomorrow — ${timeLabel}`
  return `${d.toLocaleDateString('en-AU', { weekday: 'long' })} — ${timeLabel}`
}

export const DEMO_SLOTS = () => [
  { id: 'today-18', label: weekdayLabel(0, '6:00 pm'), iso: slot(0, 18, 0) },
  { id: 'tomorrow-14', label: weekdayLabel(1, '2:30 pm'), iso: slot(1, 14, 30) },
  { id: 'friday-11', label: weekdayLabel(2, '11:00 am'), iso: slot(2, 11, 0) },
]

export async function seed() {
  const passwordHash = bcrypt.hashSync('gapswap', 10)
  const created = nowIso()

  db.exec(`
    DELETE FROM answers;
    DELETE FROM questions;
    DELETE FROM notifications;
    DELETE FROM ratings;
    DELETE FROM quizzes;
    DELETE FROM session_notes;
    DELETE FROM sessions;
    DELETE FROM matches;
    DELETE FROM match_queue;
    DELETE FROM diagnostics;
    DELETE FROM reports;
    DELETE FROM blocks;
    DELETE FROM user_concepts;
    DELETE FROM concepts;
    DELETE FROM users;
  `)

  const insertConcept = db.prepare(
    `INSERT INTO concepts (id, course_code, name, sort_order, on_gps, prereq_id)
     VALUES (@id, 'IFB104', @name, @order, @gps, @prereq)`,
  )
  for (const c of CONCEPTS) insertConcept.run(c)

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, university, course, course_code,
      avatar_color, learning_style, preference, availability, teachable,
      subjects, bio, onboarded, verified, privacy_hide_contact, reliability, created_at
    ) VALUES (
      @id, @name, @email, @password_hash, @university, @course, @course_code,
      @avatar_color, @learning_style, @preference, @availability, @teachable,
      @subjects, @bio, 1, 1, 1, @reliability, @created_at
    )
  `)

  const slots = JSON.stringify(DEMO_SLOTS().map((s) => s.id))

  insertUser.run({
    id: 'maya',
    name: 'Maya',
    email: 'maya@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#7c5cbf',
    learning_style: 'examples',
    preference: 'online',
    availability: slots,
    teachable: JSON.stringify(['Functions', 'Variables']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'First-year IT student who likes working from examples.',
    reliability: 4.9,
    created_at: created,
  })

  insertUser.run({
    id: 'alex',
    name: 'Alex T.',
    email: 'alex@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#2f6fed',
    learning_style: 'examples',
    preference: 'online',
    availability: slots,
    teachable: JSON.stringify(['Nested loops', 'Loops']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'Comfortable tracing loops; still tightening function design.',
    reliability: 4.8,
    created_at: created,
  })

  insertUser.run({
    id: 'priya',
    name: 'Priya S.',
    email: 'priya@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#c45c7a',
    learning_style: 'visual',
    preference: 'either',
    availability: JSON.stringify(['tomorrow-14', 'friday-11']),
    teachable: JSON.stringify(['Nested loops', 'Lists']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'Explains with diagrams and walkthroughs.',
    reliability: 4.6,
    created_at: created,
  })

  insertUser.run({
    id: 'jordan',
    name: 'Jordan L.',
    email: 'jordan@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#2a9d8f',
    learning_style: 'practice',
    preference: 'on-campus',
    availability: JSON.stringify(['friday-11']),
    teachable: JSON.stringify(['Nested loops']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'Prefers on-campus problem sets.',
    reliability: 4.4,
    created_at: created,
  })

  insertUser.run({
    id: 'sam',
    name: 'Sam K.',
    email: 'sam@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#e09f3e',
    learning_style: 'examples',
    preference: 'online',
    availability: slots,
    teachable: JSON.stringify(['Variables']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'Also stuck on nested loops — good group-study partner.',
    reliability: 4.2,
    created_at: created,
  })

  const insertUC = db.prepare(`
    INSERT OR REPLACE INTO user_concepts (user_id, concept_id, status, confidence, evidence, verified)
    VALUES (@user_id, @concept_id, @status, @confidence, @evidence, @verified)
  `)

  function setStatus(userId, ids, status, extra = {}) {
    for (const id of ids) {
      insertUC.run({
        user_id: userId,
        concept_id: id,
        status,
        confidence: extra.confidence || '',
        evidence: extra.evidence || '',
        verified: extra.verified || 0,
      })
    }
  }

  setStatus('maya', MASTERED, 'mastered', { confidence: 'Confident', verified: 1 })
  setStatus('maya', DEVELOPING, 'developing', { confidence: 'Unsure' })
  setStatus('maya', GAPS, 'gap', { confidence: 'Unsure' })
  insertUC.run({
    user_id: 'maya',
    concept_id: 'lists',
    status: 'next',
    confidence: '',
    evidence: '',
    verified: 0,
  })

  const alexMastered = [
    ...MASTERED.filter((id) => id !== 'functions'),
    'loops',
    'nested-loops',
    'loop-reset',
    'while-loops',
    'tracing',
    'lists',
  ]
  setStatus('alex', alexMastered, 'mastered', { confidence: 'Confident', verified: 1 })
  setStatus('alex', ['functions', 'return-values', 'scope'], 'gap', { confidence: 'Unsure' })
  insertUC.run({
    user_id: 'alex',
    concept_id: 'accumulators',
    status: 'developing',
    confidence: 'Unsure',
    evidence: '',
    verified: 0,
  })

  setStatus('priya', [...MASTERED, 'loops', 'nested-loops', 'lists'], 'mastered', {
    confidence: 'Confident',
    verified: 1,
  })
  setStatus('priya', ['functions', 'scope'], 'developing', { confidence: 'Unsure' })
  insertUC.run({
    user_id: 'priya',
    concept_id: 'off-by-one',
    status: 'gap',
    confidence: '',
    evidence: '',
    verified: 0,
  })

  setStatus('jordan', [...MASTERED, 'loops', 'nested-loops'], 'mastered', {
    confidence: 'Confident',
    verified: 0,
  })
  setStatus('jordan', ['lists', 'functions'], 'developing')

  setStatus('sam', MASTERED, 'mastered')
  setStatus('sam', GAPS, 'gap')
  setStatus('sam', DEVELOPING, 'developing')

  const sessionId = 'session-maya-alex'
  db.prepare(`
    INSERT INTO matches (id, requester_id, partner_id, mode, gap_concept, teach_concept, score, reasons, status, created_at)
    VALUES (@id, 'maya', 'alex', 'swap', 'Nested loops', 'Functions', 94, @reasons, 'accepted', @created_at)
  `).run({
    id: 'match-maya-alex',
    reasons: JSON.stringify([
      'Strong in Nested loops',
      'Learning Functions',
      'Same course',
      'Verified by diagnostic',
    ]),
    created_at: created,
  })

  db.prepare(`
    INSERT INTO sessions (
      id, match_id, host_id, partner_id, gap_concept, teach_concept,
      starts_at, duration_min, format, meeting_url, agenda, notes_shared,
      workspace, status, role_phase, reminder_min, created_at
    ) VALUES (
      @id, 'match-maya-alex', 'maya', 'alex', 'Nested loops', 'Functions',
      @starts_at, 20, 'online', @meeting_url, @agenda, '',
      @workspace, 'scheduled', 'a_teaches', 15, @created_at
    )
  `).run({
    id: sessionId,
    starts_at: slot(0, 18, 0),
    meeting_url: `https://meet.jit.si/GapSwap-${sessionId}`,
    agenda: JSON.stringify([
      { minutes: 10, title: 'Maya teaches Functions', owner: 'Maya' },
      { minutes: 10, title: 'Alex teaches Nested loops', owner: 'Alex T.' },
    ]),
    workspace: JSON.stringify({
      code: 'for i in range(2):\n    for j in range(3):\n        print(i, j)',
      annotation: 'inner loop restarts here',
      trace: [
        { i: 0, j: 0, out: '0 0' },
        { i: 0, j: 1, out: '0 1' },
        { i: 0, j: 2, out: '0 2' },
        { i: 1, j: 0, out: '1 0' },
        { i: 1, j: 1, out: '1 1' },
        { i: 1, j: 2, out: '1 2' },
      ],
    }),
    created_at: created,
  })

  db.prepare(`
    INSERT INTO questions (id, author_id, concept, title, body, status, created_at)
    VALUES
      ('q1', 'sam', 'Nested loops', 'Why does the inner loop restart?', 'I expected j to keep climbing after the outer loop moves on.', 'open', @created_at),
      ('q2', 'jordan', 'Functions', 'When should I use a return value?', 'I keep printing inside the function instead of returning.', 'open', @created_at)
  `).run({ created_at: created })

  db.prepare(`
    INSERT INTO answers (id, question_id, author_id, body, created_at)
    VALUES ('a1', 'q2', 'maya', 'Return when another part of the program needs the result — print is just for you to see it.', @created_at)
  `).run({ created_at: created })

  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
    VALUES
      ('n1', 'maya', 'session', 'GapSwap with Alex today', 'Online room at 6:00 pm — Nested loops ↔ Functions.', '/sessions/session-maya-alex', 0, @created_at),
      ('n2', 'maya', 'match', 'Alex T. is a 94% match', 'They can teach Nested loops and want help with Functions.', '/match', 0, @created_at),
      ('n3', 'maya', 'board', 'New reply on the questions board', 'Your explanation on return values was marked helpful.', '/questions', 1, @created_at),
      ('n-alex', 'alex', 'session', 'GapSwap with Maya today', 'Online room at 6:00 pm — you teach Nested loops, Maya teaches Functions.', '/sessions/session-maya-alex', 0, @created_at)
  `).run({ created_at: created })

  insertDemoDiagnostics(created)

  db.prepare(`
    INSERT INTO ratings (id, session_id, from_user, to_user, helpfulness, clarity, reliability, respectfulness, goal_achieved, created_at)
    VALUES ('r1', 'past-demo', 'priya', 'maya', 5, 5, 5, 5, 1, @created_at)
  `).run({ created_at: created })

  return {
    ok: true,
    demo: { email: 'maya@qut.edu.au', password: 'gapswap' },
    sessioner: { email: 'alex@qut.edu.au', password: 'gapswap' },
  }
}

const ALEX_DIAGNOSIS = {
  understood: ['Nested loops', 'Loops', 'Variables'],
  developing: ['Accumulators'],
  gap: {
    concept: 'Functions',
    conceptId: 'functions',
    misconception:
      'You can teach nested loops, but still print inside a function instead of returning a value the caller can use.',
    whyItMatters:
      'A return value is what Maya needs in exchange. Printing only shows the result — it does not hand it back.',
  },
  nextConcept: 'Return values',
  confidence: 0.84,
  evidence: {
    prediction: 'Expected print() inside the function to be enough.',
    reasoning: 'Thought the output was the same as giving a result back.',
    confidence: 'Unsure',
  },
  plan: {
    alreadyKnows: 'You can trace nested loops and you are happy teaching them.',
    misunderstood: 'print shows a value; return gives it to the rest of the program.',
    whyItMatters: 'Maya can teach this in the swap while you teach Nested loops.',
    learnFirst: 'Write a tiny function that returns a number, then print the return value outside it.',
    explanation: 'The caller only sees what you return. print is just for you to look at.',
    practice: [
      'Change a function that prints a total so it returns the total instead.',
      'Call it and print the result in the main program.',
    ],
    resources: [{ title: 'Python Tutor — visual trace', url: 'https://pythontutor.com/' }],
    peerRecommended: true,
  },
}

function insertDemoDiagnostics(created) {
  const upsert = db.prepare(`
    INSERT OR REPLACE INTO diagnostics (
      id, user_id, course_code, mode, question, working, notes,
      conversation, current_step, total_steps, status, result, created_at
    ) VALUES (@id, @user_id, 'IFB104', 'stuck', @question, '', '', '[]', 3, 3, 'complete', @result, @created_at)
  `)
  upsert.run({
    id: 'diag-maya-nested',
    user_id: 'maya',
    question: 'Why does the inner loop restart every time?',
    result: JSON.stringify(FALLBACK_DIAGNOSIS),
    created_at: created,
  })
  upsert.run({
    id: 'diag-alex-functions',
    user_id: 'alex',
    question: 'When should I return a value instead of printing?',
    result: JSON.stringify(ALEX_DIAGNOSIS),
    created_at: created,
  })
}

function upsertDemoUser(row) {
  db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, university, course, course_code,
      avatar_color, learning_style, preference, availability, teachable,
      subjects, bio, onboarded, verified, privacy_hide_contact, reliability, created_at
    ) VALUES (
      @id, @name, @email, @password_hash, @university, @course, @course_code,
      @avatar_color, @learning_style, @preference, @availability, @teachable,
      @subjects, @bio, 1, 1, 1, @reliability, @created_at
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      password_hash = excluded.password_hash,
      university = excluded.university,
      course = excluded.course,
      course_code = excluded.course_code,
      avatar_color = excluded.avatar_color,
      learning_style = excluded.learning_style,
      preference = excluded.preference,
      availability = excluded.availability,
      teachable = excluded.teachable,
      subjects = excluded.subjects,
      bio = excluded.bio,
      onboarded = 1,
      verified = 1,
      reliability = excluded.reliability
  `).run(row)
}

export function ensureDemoPair() {
  const passwordHash = bcrypt.hashSync('gapswap', 10)
  const created = nowIso()
  const slots = JSON.stringify(DEMO_SLOTS().map((s) => s.id))

  const insertConcept = db.prepare(
    `INSERT OR IGNORE INTO concepts (id, course_code, name, sort_order, on_gps, prereq_id)
     VALUES (@id, 'IFB104', @name, @order, @gps, @prereq)`,
  )
  for (const c of CONCEPTS) insertConcept.run(c)

  upsertDemoUser({
    id: 'maya',
    name: 'Maya',
    email: 'maya@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#7c5cbf',
    learning_style: 'examples',
    preference: 'online',
    availability: slots,
    teachable: JSON.stringify(['Functions', 'Variables']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'First-year IT student who likes working from examples.',
    reliability: 4.9,
    created_at: created,
  })
  upsertDemoUser({
    id: 'alex',
    name: 'Alex T.',
    email: 'alex@qut.edu.au',
    password_hash: passwordHash,
    university: 'QUT',
    course: 'Building IT Systems',
    course_code: 'IFB104',
    avatar_color: '#2f6fed',
    learning_style: 'examples',
    preference: 'online',
    availability: slots,
    teachable: JSON.stringify(['Nested loops', 'Loops']),
    subjects: JSON.stringify(['IFB104 — Building IT Systems']),
    bio: 'Comfortable tracing loops; still tightening function design.',
    reliability: 4.8,
    created_at: created,
  })

  db.prepare(`DELETE FROM user_concepts WHERE user_id IN ('maya', 'alex')`).run()
  const insertUC = db.prepare(`
    INSERT OR REPLACE INTO user_concepts (user_id, concept_id, status, confidence, evidence, verified)
    VALUES (@user_id, @concept_id, @status, @confidence, @evidence, @verified)
  `)
  function setStatus(userId, ids, status, extra = {}) {
    for (const id of ids) {
      insertUC.run({
        user_id: userId,
        concept_id: id,
        status,
        confidence: extra.confidence || '',
        evidence: extra.evidence || '',
        verified: extra.verified || 0,
      })
    }
  }
  setStatus('maya', MASTERED, 'mastered', { confidence: 'Confident', verified: 1 })
  setStatus('maya', DEVELOPING, 'developing', { confidence: 'Unsure' })
  setStatus('maya', GAPS, 'gap', { confidence: 'Unsure' })
  insertUC.run({
    user_id: 'maya',
    concept_id: 'lists',
    status: 'next',
    confidence: '',
    evidence: '',
    verified: 0,
  })
  const alexMastered = [
    ...MASTERED.filter((id) => id !== 'functions'),
    'loops',
    'nested-loops',
    'loop-reset',
    'while-loops',
    'tracing',
    'lists',
  ]
  setStatus('alex', alexMastered, 'mastered', { confidence: 'Confident', verified: 1 })
  setStatus('alex', ['functions', 'return-values', 'scope'], 'gap', { confidence: 'Unsure' })
  insertUC.run({
    user_id: 'alex',
    concept_id: 'accumulators',
    status: 'developing',
    confidence: 'Unsure',
    evidence: '',
    verified: 0,
  })

  db.prepare(`
    DELETE FROM quizzes WHERE session_id IN (
      SELECT id FROM sessions
      WHERE (host_id = 'maya' AND partner_id = 'alex') OR (host_id = 'alex' AND partner_id = 'maya')
    )
  `).run()
  db.prepare(`
    DELETE FROM session_notes WHERE session_id IN (
      SELECT id FROM sessions
      WHERE (host_id = 'maya' AND partner_id = 'alex') OR (host_id = 'alex' AND partner_id = 'maya')
    )
  `).run()
  db.prepare(`
    DELETE FROM sessions
    WHERE (host_id = 'maya' AND partner_id = 'alex') OR (host_id = 'alex' AND partner_id = 'maya')
  `).run()
  db.prepare(`
    DELETE FROM matches
    WHERE (requester_id = 'maya' AND partner_id = 'alex') OR (requester_id = 'alex' AND partner_id = 'maya')
  `).run()

  db.prepare(`
    INSERT INTO matches (id, requester_id, partner_id, mode, gap_concept, teach_concept, score, reasons, status, created_at)
    VALUES (@id, 'maya', 'alex', 'swap', 'Nested loops', 'Functions', 94, @reasons, 'accepted', @created_at)
  `).run({
    id: 'match-maya-alex',
    reasons: JSON.stringify([
      'Strong in Nested loops',
      'Learning Functions',
      'Same course',
      'Verified by diagnostic',
    ]),
    created_at: created,
  })

  const sessionId = 'session-maya-alex'
  db.prepare(`
    INSERT INTO sessions (
      id, match_id, host_id, partner_id, gap_concept, teach_concept,
      starts_at, duration_min, format, meeting_url, agenda, notes_shared,
      workspace, status, role_phase, reminder_min, created_at
    ) VALUES (
      @id, 'match-maya-alex', 'maya', 'alex', 'Nested loops', 'Functions',
      @starts_at, 20, 'online', @meeting_url, @agenda, '',
      @workspace, 'scheduled', 'a_teaches', 15, @created_at
    )
  `).run({
    id: sessionId,
    starts_at: slot(0, 18, 0),
    meeting_url: `https://meet.jit.si/GapSwap-${sessionId}`,
    agenda: JSON.stringify([
      { minutes: 10, title: 'Maya teaches Functions', owner: 'Maya' },
      { minutes: 10, title: 'Alex teaches Nested loops', owner: 'Alex T.' },
    ]),
    workspace: JSON.stringify({
      code: 'for i in range(2):\n    for j in range(3):\n        print(i, j)',
      annotation: 'inner loop restarts here',
      trace: [
        { i: 0, j: 0, out: '0 0' },
        { i: 0, j: 1, out: '0 1' },
        { i: 0, j: 2, out: '0 2' },
        { i: 1, j: 0, out: '1 0' },
        { i: 1, j: 1, out: '1 1' },
        { i: 1, j: 2, out: '1 2' },
      ],
    }),
    created_at: created,
  })

  insertDemoDiagnostics(created)

  db.prepare(`DELETE FROM notifications WHERE id IN ('n1', 'n2', 'n-alex')`).run()
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
    VALUES
      ('n1', 'maya', 'session', 'GapSwap with Alex today', 'Online room at 6:00 pm — Nested loops ↔ Functions.', '/sessions/session-maya-alex', 0, @created_at),
      ('n2', 'maya', 'match', 'Alex T. is a 94% match', 'They can teach Nested loops and want help with Functions.', '/match', 0, @created_at),
      ('n-alex', 'alex', 'session', 'GapSwap with Maya today', 'Online room at 6:00 pm — you teach Nested loops, Maya teaches Functions.', '/sessions/session-maya-alex', 0, @created_at)
  `).run({ created_at: created })

  return { ok: true }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  seed().then((result) => {
    console.log('Seeded GapSwap demo data', result.demo)
  })
}
