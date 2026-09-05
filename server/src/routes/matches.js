import { randomUUID } from 'node:crypto'
import { db, nowIso } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { rankMatches, defaultAgenda } from '../services/matching.js'
import { DEMO_SLOTS } from '../seed.js'
import { chatJson } from '../services/openai.js'

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
    const gap = ranked[0]?.youNeed || null
    const teach = ranked[0]?.youCanTeach || null
    const slots = DEMO_SLOTS()

    const fallback = {
      queued: false,
      group: ranked.filter((r) => r.theyNeed === gap).slice(0, 3),
      community: [
        { title: 'IFB104 nested-loop workshop', when: 'Tuesday 12:00 pm', place: 'Online' },
        { title: 'Peer drop-in: tracing tables', when: 'Wednesday 4:00 pm', place: 'Gardens Point' },
      ],
      socratic: {
        title: gap ? `Guided practice: ${gap}` : 'Diagnose a gap first',
        summary: gap
          ? `Work a short Socratic walkthrough for ${gap} until a peer is free.`
          : 'Complete a diagnostic or post a question so we know what to match on.',
      },
      practice: gap ? [`Trace one small example of ${gap}.`, `Explain ${gap} out loud without code.`] : [],
      resources: [
        { title: 'Python Tutor — visual trace', url: 'https://pythontutor.com/' },
        { title: 'Questions board', url: '/questions' },
      ],
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
    const ranked = partnerId
      ? rankMatches(req.userRow, mode || 'swap').find((m) => m.userId === partnerId)
      : rankMatches(req.userRow, mode || 'swap')[0]
    const topic = gapConcept || ranked?.youNeed || 'this topic'
    const teach = teachConcept || ranked?.youCanTeach || 'a strength'
    if (!partnerId) {
      const id = randomUUID()
      db.prepare(`
        INSERT INTO match_queue (id, user_id, concept, mode, created_at) VALUES (?, ?, ?, ?, ?)
      `).run(id, req.user.id, topic, mode || 'swap', nowIso())
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

    const matchId = randomUUID()
    db.prepare(`
      INSERT INTO matches (id, requester_id, partner_id, mode, gap_concept, teach_concept, score, reasons, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?)
    `).run(
      matchId,
      req.user.id,
      partnerId,
      mode || 'swap',
      topic,
      teach,
      ranked?.score || 80,
      JSON.stringify(ranked?.reasons || ['Compatible knowledge']),
      nowIso(),
    )

    const slot = DEMO_SLOTS().find((s) => s.id === slotId) || DEMO_SLOTS()[0]
    const sessionId = randomUUID()
    const duration = 20
    const agenda = defaultAgenda(req.user.name, partner.name, teach, topic, duration)
    const meetingUrl = `https://meet.jit.si/GapSwap-${sessionId}`
    const nested = /nested|inner loop/i.test(topic)

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
      topic,
      teach,
      slot.iso,
      duration,
      format || 'online',
      meetingUrl,
      JSON.stringify(agenda),
      JSON.stringify(
        nested
          ? {
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
            }
          : { code: '', annotation: `Worked example for ${topic}`, trace: [] },
      ),
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
    const topic = req.body?.topic || 'this topic'
    const ai = await chatJson(
      'You are a Socratic tutor. Do not give the final answer. JSON: { "title": "", "steps": [{"ask": "", "hint": ""}], "check": "" }',
      `Teach ${topic} socratically to a student whose diagnosis is ${gps?.result || '{}'}`,
    )
    res.json(
      ai || {
        title: `A closer look at ${topic}`,
        steps: [
          { ask: `What is ${topic} actually doing, in one sentence?`, hint: 'Name the rule before tracing details.' },
          { ask: 'Where would that rule first go wrong in a tiny example?', hint: 'The shaky step is the gap.' },
        ],
        check: `Retry a small example of ${topic} without looking at notes.`,
      },
    )
  })
}
