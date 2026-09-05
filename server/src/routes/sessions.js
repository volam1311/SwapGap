import { randomUUID } from 'node:crypto'
import { db, nowIso, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { chatJson } from '../services/openai.js'
import { FALLBACK_QUIZ, gradeShort, COHORT_INSIGHTS, FALLBACK_DIAGNOSIS } from '../services/fallback.js'
import { shapeSession } from './me.js'

function loadSession(id, userId) {
  const s = db.prepare(`
    SELECT s.*,
      host.name AS host_name, host.avatar_color AS host_color,
      partner.name AS partner_name, partner.avatar_color AS partner_color
    FROM sessions s
    JOIN users host ON host.id = s.host_id
    JOIN users partner ON partner.id = s.partner_id
    WHERE s.id = ?
  `).get(id)
  if (!s) return null
  if (s.host_id !== userId && s.partner_id !== userId) return null
  return s
}

function fullSession(s, userId) {
  const youAreHost = s.host_id === userId
  const notes = db.prepare('SELECT private_notes FROM session_notes WHERE session_id = ? AND user_id = ?').get(s.id, userId)
  return {
    id: s.id,
    matchId: s.match_id,
    youAreHost,
    you: youAreHost
      ? { id: s.host_id, name: s.host_name, color: s.host_color, role: s.role_phase === 'a_teaches' ? 'Facilitating' : 'Explaining back' }
      : { id: s.partner_id, name: s.partner_name, color: s.partner_color, role: s.role_phase === 'b_teaches' ? 'Facilitating' : 'Explaining back' },
    peer: youAreHost
      ? { id: s.partner_id, name: s.partner_name, color: s.partner_color, role: s.role_phase === 'b_teaches' ? 'Facilitating' : 'Explaining back' }
      : { id: s.host_id, name: s.host_name, color: s.host_color, role: s.role_phase === 'a_teaches' ? 'Facilitating' : 'Explaining back' },
    gapConcept: s.gap_concept,
    teachConcept: s.teach_concept,
    youFacilitateConcept: youAreHost ? s.teach_concept : s.gap_concept,
    peerFacilitateConcept: youAreHost ? s.gap_concept : s.teach_concept,
    startsAt: s.starts_at,
    durationMin: s.duration_min,
    format: s.format,
    meetingUrl: s.meeting_url,
    agenda: parseJson(s.agenda, []),
    notesShared: s.notes_shared,
    privateNotes: notes?.private_notes || '',
    workspace: parseJson(s.workspace, {}),
    status: s.status,
    rolePhase: s.role_phase,
    reminderMin: s.reminder_min,
    checklist: [
      'Read the session pack',
      'Ask the three prompt questions',
      'Listen for a fluent explanation — do not invent theory',
    ],
  }
}

export function sessionRoutes(app) {
  app.get('/api/sessions', requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT s.*, u.name AS partner_name, u.avatar_color AS partner_color
      FROM sessions s
      JOIN users u ON u.id = CASE WHEN s.host_id = ? THEN s.partner_id ELSE s.host_id END
      WHERE s.host_id = ? OR s.partner_id = ?
      ORDER BY s.starts_at DESC
    `).all(req.user.id, req.user.id, req.user.id)
    res.json({ sessions: rows.map(shapeSession) })
  })

  app.get('/api/sessions/:id', requireAuth, (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    res.json(fullSession(s, req.user.id))
  })

  app.patch('/api/sessions/:id', requireAuth, (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { status, rolePhase, notesShared, privateNotes, reminderMin, startsAt } = req.body || {}
    if (status) db.prepare('UPDATE sessions SET status = ? WHERE id = ?').run(status, s.id)
    if (rolePhase) db.prepare('UPDATE sessions SET role_phase = ? WHERE id = ?').run(rolePhase, s.id)
    if (notesShared != null) db.prepare('UPDATE sessions SET notes_shared = ? WHERE id = ?').run(notesShared, s.id)
    if (reminderMin != null) db.prepare('UPDATE sessions SET reminder_min = ? WHERE id = ?').run(reminderMin, s.id)
    if (startsAt) {
      db.prepare("UPDATE sessions SET starts_at = ?, status = 'scheduled' WHERE id = ?").run(startsAt, s.id)
    }
    if (privateNotes != null) {
      db.prepare(`
        INSERT INTO session_notes (session_id, user_id, private_notes) VALUES (?, ?, ?)
        ON CONFLICT(session_id, user_id) DO UPDATE SET private_notes = excluded.private_notes
      `).run(s.id, req.user.id, privateNotes)
    }
    const updated = loadSession(s.id, req.user.id)
    res.json(fullSession(updated, req.user.id))
  })

  app.post('/api/sessions/:id/cancel', requireAuth, (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    db.prepare("UPDATE sessions SET status = 'cancelled' WHERE id = ?").run(s.id)
    const other = s.host_id === req.user.id ? s.partner_id : s.host_id
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
      VALUES (?, ?, 'session', 'Session cancelled', ?, '/sessions', 0, ?)
    `).run(randomUUID(), other, `${req.user.name} cancelled the GapSwap.`, nowIso())
    res.json({ ok: true })
  })

  app.post('/api/sessions/:id/assistant', requireAuth, async (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const { action, notes } = req.body || {}
    const fallback = {
      hint: 'Show what j is at the end of the first outer lap, then immediately after i becomes 1. The jump back to 0 is the restart.',
      example: 'Print both i and j, and draw a box around each full inner pass.',
      question: 'If range(3) ran only once ever, how many lines would print? Why is the real answer 6?',
      summary: (notes || s.notes_shared || 'Inner loop resets each time the outer loop advances.').slice(0, 400),
      prompt: 'Show why the inner loop restarts.',
    }
    const ai = await chatJson(
      'You are GapSwap session assistant. Support two students; do not replace them. JSON: { "hint": "", "example": "", "question": "", "summary": "", "prompt": "" }',
      `Action: ${action || 'hint'}. Session on ${s.gap_concept} / ${s.teach_concept}. Notes: ${notes || s.notes_shared}`,
    )
    res.json(ai || fallback)
  })

  app.post('/api/sessions/:id/quiz', requireAuth, async (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })

    if (req.body?.generate) {
      const ai = await chatJson(
        'Create a 2-question transfer quiz. JSON: { "items": [{"id": "", "prompt": "", "code": "", "type": "short", "answer": ""}] }',
        `Original gap: ${s.gap_concept}. Misconception: inner loop continues instead of restarting.`,
      )
      const items = ai?.items?.length ? ai.items : FALLBACK_QUIZ
      return res.json({ items, cohort: COHORT_INSIGHTS })
    }

    const items = req.body?.items || FALLBACK_QUIZ
    const answers = req.body?.answers || []
    let correct = 0
    const graded = items.map((item, i) => {
      const ok = gradeShort(item.answer, answers[i])
      if (ok) correct += 1
      return { ...item, given: answers[i] || '', correct: ok }
    })
    const passed = correct >= Math.ceil(items.length / 2)
    const quizId = randomUUID()
    db.prepare(`
      INSERT INTO quizzes (id, session_id, user_id, items, answers, score, misconception_corrected, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(quizId, s.id, req.user.id, JSON.stringify(graded), JSON.stringify(answers), correct, passed ? 1 : 0, nowIso())

    if (passed) {
      const gap = db.prepare('SELECT id FROM concepts WHERE name = ?').get(s.gap_concept)
      if (gap) {
        db.prepare(`
          INSERT INTO user_concepts (user_id, concept_id, status, confidence, evidence, verified)
          VALUES (?, ?, 'mastered', 'Confident', 'Verified after GapSwap', 1)
          ON CONFLICT(user_id, concept_id) DO UPDATE SET
            status = 'mastered', confidence = 'Confident', evidence = 'Verified after GapSwap', verified = 1
        `).run(req.user.id, gap.id)
      }
      db.prepare("UPDATE sessions SET status = 'completed' WHERE id = ?").run(s.id)
    }

    const path = db.prepare(`
      SELECT c.id, c.name, uc.status FROM concepts c
      LEFT JOIN user_concepts uc ON uc.concept_id = c.id AND uc.user_id = ?
      WHERE c.on_gps = 1 ORDER BY c.sort_order
    `).all(req.user.id)

    const diagRow = db
      .prepare(`SELECT * FROM diagnostics WHERE user_id = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1`)
      .get(req.user.id)
    const diagnosis = parseJson(diagRow?.result, FALLBACK_DIAGNOSIS)
    const peerName = s.host_id === req.user.id ? s.partner_name : s.host_name

    res.json({
      quizId,
      correct,
      total: items.length,
      passed,
      items: graded,
      mastered: passed ? s.gap_concept : null,
      path,
      cohort: COHORT_INSIGHTS,
      masteryRate: 68,
      peerName,
      peerConcept: s.gap_concept,
      escalation: {
        destination: 'Student Success',
        concept: s.gap_concept,
        misconception: diagnosis?.gap?.misconception || `Still developing ${s.gap_concept}.`,
        evidence: diagnosis?.evidence || {},
        whyItMatters: diagnosis?.gap?.whyItMatters || '',
      },
    })
  })

  app.post('/api/sessions/:id/rate', requireAuth, (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const toUser = s.host_id === req.user.id ? s.partner_id : s.host_id
    const id = randomUUID()
    const { helpfulness, clarity, reliability, respectfulness, goalAchieved } = req.body || {}
    db.prepare(`
      INSERT INTO ratings (id, session_id, from_user, to_user, helpfulness, clarity, reliability, respectfulness, goal_achieved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      s.id,
      req.user.id,
      toUser,
      helpfulness ?? 5,
      clarity ?? 5,
      reliability ?? 5,
      respectfulness ?? 5,
      goalAchieved === false ? 0 : 1,
      nowIso(),
    )
    res.json({ ok: true })
  })

  app.get('/api/sessions/:id/ics', requireAuth, (req, res) => {
    const s = loadSession(req.params.id, req.user.id)
    if (!s) return res.status(404).json({ error: 'Session not found' })
    const start = new Date(s.starts_at)
    const end = new Date(start.getTime() + s.duration_min * 60000)
    const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z')
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GapSwap//EN
BEGIN:VEVENT
UID:${s.id}@gapswap
DTSTAMP:${stamp(new Date())}
DTSTART:${stamp(start)}
DTEND:${stamp(end)}
SUMMARY:GapSwap with ${s.host_id === req.user.id ? s.partner_name : s.host_name}
DESCRIPTION:${s.gap_concept} ↔ ${s.teach_concept}\\n${s.meeting_url}
LOCATION:${s.format === 'online' ? s.meeting_url : 'On campus'}
END:VEVENT
END:VCALENDAR`
    res.setHeader('Content-Type', 'text/calendar')
    res.send(ics)
  })
}
