import { randomUUID } from 'node:crypto'
import { db, nowIso } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { rankMatches, defaultAgenda } from '../services/matching.js'
import { DEMO_SLOTS } from '../seed.js'
import { chatJson } from '../services/openai.js'
import { FALLBACK_DIAGNOSIS } from '../services/fallback.js'

function notify(userId, type, title, body, link) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(randomUUID(), userId, type, title, body, link || '', nowIso())
}

export function matchRoutes(app) {
  app.get('/api/matches', requireAuth, (req, res) => {
    const mode = req.query.mode || 'swap'
    const ranked = rankMatches(req.userRow, mode)
    const gap = ranked[0]?.youNeed || FALLBACK_DIAGNOSIS.gap.concept
    const teach = ranked[0]?.youCanTeach || 'Functions'
    const slots = DEMO_SLOTS()

    const fallback = {
      queued: false,
      group: ranked.filter((r) => r.theyNeed === gap).slice(0, 3),
      community: [
        { title: 'IFB104 nested-loop workshop', when: 'Tuesday 12:00 pm', place: 'Online' },
        { title: 'Peer drop-in: tracing tables', when: 'Wednesday 4:00 pm', place: 'Gardens Point' },
      ],
      socratic: {
        title: 'AI-guided Socratic lesson',
        summary: FALLBACK_DIAGNOSIS.plan.explanation,
      },
      practice: FALLBACK_DIAGNOSIS.plan.practice,
      resources: FALLBACK_DIAGNOSIS.plan.resources,
    }

    res.json({
      mode,
      youNeed: gap,
      youCanTeach: teach,
      slots,
      matches: ranked,
      empty: ranked.length === 0,
      fallback,
    })
  })

  app.post('/api/matches', requireAuth, (req, res) => {
    const { partnerId, mode, gapConcept, teachConcept, slotId, format } = req.body || {}
    if (!partnerId) {
      const id = randomUUID()
      db.prepare(`
        INSERT INTO match_queue (id, user_id, concept, mode, created_at) VALUES (?, ?, ?, ?, ?)
      `).run(id, req.user.id, gapConcept || 'Nested loops', mode || 'swap', nowIso())
      notify(
        req.user.id,
        'queue',
        'You are in the matching queue',
        'We will notify you when a suitable peer is free.',
        '/match',
      )
      return res.json({ queued: true, id })
    }

    const partner = db.prepare('SELECT * FROM users WHERE id = ?').get(partnerId)
    if (!partner) return res.status(404).json({ error: 'Peer not found' })

    const ranked = rankMatches(req.userRow, mode || 'swap').find((m) => m.userId === partnerId)
    const matchId = randomUUID()
    db.prepare(`
      INSERT INTO matches (id, requester_id, partner_id, mode, gap_concept, teach_concept, score, reasons, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?)
    `).run(
      matchId,
      req.user.id,
      partnerId,
      mode || 'swap',
      gapConcept || ranked?.youNeed || 'Nested loops',
      teachConcept || ranked?.youCanTeach || 'Functions',
      ranked?.score || 80,
      JSON.stringify(ranked?.reasons || ['Compatible knowledge']),
      nowIso(),
    )

    const slot = DEMO_SLOTS().find((s) => s.id === slotId) || DEMO_SLOTS()[0]
    const sessionId = randomUUID()
    const duration = 20
    const agenda = defaultAgenda(
      req.user.name,
      partner.name,
      teachConcept || ranked?.youCanTeach || 'Functions',
      gapConcept || ranked?.youNeed || 'Nested loops',
      duration,
    )
    const meetingUrl = `https://meet.jit.si/GapSwap-${sessionId}`

    db.prepare(`
      INSERT INTO sessions (
        id, match_id, host_id, partner_id, gap_concept, teach_concept,
        starts_at, duration_min, format, meeting_url, agenda, notes_shared,
        workspace, status, role_phase, reminder_min, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 'scheduled', 'a_teaches', 15, ?)
    `).run(
      sessionId,
      matchId,
      req.user.id,
      partnerId,
      gapConcept || ranked?.youNeed || 'Nested loops',
      teachConcept || ranked?.youCanTeach || 'Functions',
      slot.iso,
      duration,
      format || 'online',
      meetingUrl,
      JSON.stringify(agenda),
      JSON.stringify({
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
      nowIso(),
    )

    notify(
      partnerId,
      'match',
      `${req.user.name} booked a GapSwap`,
      `${slot.label} · ${format || 'online'}`,
      `/sessions/${sessionId}`,
    )
    notify(
      req.user.id,
      'session',
      'Session confirmed',
      `GapSwap with ${partner.name} · ${slot.label}`,
      `/sessions/${sessionId}`,
    )

    res.json({ matchId, sessionId, meetingUrl, startsAt: slot.iso, agenda })
  })

  app.post('/api/matches/socratic', requireAuth, async (req, res) => {
    const gps = db.prepare(`
      SELECT * FROM diagnostics WHERE user_id = ? AND status = 'complete' ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id)
    const topic = req.body?.topic || 'Nested loops'
    const ai = await chatJson(
      'You are a Socratic tutor. Do not give the final answer. JSON: { "title": "", "steps": [{"ask": "", "hint": ""}], "check": "" }',
      `Teach ${topic} socratically to a student whose diagnosis is ${gps?.result || JSON.stringify(FALLBACK_DIAGNOSIS)}`,
    )
    res.json(
      ai || {
        title: 'Why the inner loop restarts',
        steps: [
          { ask: 'When the outer loop repeats, is the inner loop the same object or a new one?', hint: 'Think of range(3) as a fresh sequence.' },
          { ask: 'What value must j have at the start of a new outer iteration?', hint: 'The first value of range(3).' },
        ],
        check: 'Trace one full outer iteration, then the first step of the next.',
      },
    )
  })
}
