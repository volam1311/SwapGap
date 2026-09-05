import { db, meUser, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { buildCertificate } from '../services/certificate.js'

function counts(userId) {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM user_concepts WHERE user_id = ? GROUP BY status').all(userId)
  const map = { mastered: 0, developing: 0, gap: 0, next: 0 }
  for (const r of rows) map[r.status] = r.n
  return map
}

function upcoming(userId) {
  return db.prepare(`
    SELECT s.*, u.name AS partner_name, u.avatar_color AS partner_color
    FROM sessions s
    JOIN users u ON u.id = CASE WHEN s.host_id = ? THEN s.partner_id ELSE s.host_id END
    WHERE (s.host_id = ? OR s.partner_id = ?) AND s.status IN ('scheduled', 'live')
    ORDER BY s.starts_at ASC
  `).all(userId, userId, userId)
}

export function meRoutes(app) {
  app.get('/api/me', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    res.json({
      user: meUser(row),
      counts: counts(req.user.id),
      upcoming: upcoming(req.user.id).map(shapeSession),
    })
  })

  app.patch('/api/me', requireAuth, (req, res) => {
    const allowed = [
      'name',
      'university',
      'course',
      'course_code',
      'learning_style',
      'preference',
      'bio',
    ]
    const body = req.body || {}
    const jsonFields = {
      availability: body.availability,
      teachable: body.teachable,
      subjects: body.subjects,
    }
    const sets = []
    const vals = []
    for (const key of allowed) {
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      if (body[camel] != null || body[key] != null) {
        sets.push(`${key} = ?`)
        vals.push(body[camel] ?? body[key])
      }
    }
    if (jsonFields.availability) {
      sets.push('availability = ?')
      vals.push(JSON.stringify(jsonFields.availability))
    }
    if (jsonFields.teachable) {
      sets.push('teachable = ?')
      vals.push(JSON.stringify(jsonFields.teachable))
    }
    if (jsonFields.subjects) {
      sets.push('subjects = ?')
      vals.push(JSON.stringify(jsonFields.subjects))
    }
    if (body.onboarded != null) {
      sets.push('onboarded = ?')
      vals.push(body.onboarded ? 1 : 0)
    }
    if (body.privacyHideContact != null) {
      sets.push('privacy_hide_contact = ?')
      vals.push(body.privacyHideContact ? 1 : 0)
    }
    if (sets.length) {
      vals.push(req.user.id)
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    }
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
    res.json({ user: meUser(row) })
  })

  app.get('/api/me/dashboard', requireAuth, (req, res) => {
    const gps = db.prepare(`
      SELECT c.id, c.name, c.sort_order, uc.status, uc.confidence
      FROM concepts c
      LEFT JOIN user_concepts uc ON uc.concept_id = c.id AND uc.user_id = ?
      WHERE c.on_gps = 1
      ORDER BY c.sort_order
    `).all(req.user.id)

    const recent = db.prepare(`
      SELECT * FROM diagnostics WHERE user_id = ? ORDER BY created_at DESC LIMIT 3
    `).all(req.user.id)

    const taught = parseJson(req.userRow.teachable, [])
    const ratings = db.prepare('SELECT * FROM ratings WHERE to_user = ?').all(req.user.id)
    const sessionsDone = db.prepare(`
      SELECT COUNT(*) AS n FROM sessions
      WHERE (host_id = ? OR partner_id = ?) AND status = 'completed'
    `).get(req.user.id, req.user.id).n

    res.json({
      user: req.user,
      counts: counts(req.user.id),
      gps,
      upcoming: upcoming(req.user.id).map(shapeSession),
      recentDiagnostics: recent.map((d) => ({
        id: d.id,
        question: d.question,
        status: d.status,
        result: parseJson(d.result, {}),
        createdAt: d.created_at,
      })),
      teachable: taught,
      stats: {
        sessionsCompleted: sessionsDone,
        ratingsCount: ratings.length,
        avgHelpfulness: avg(ratings.map((r) => r.helpfulness)),
        reliability: req.user.reliability,
        badges: buildBadges(sessionsDone, ratings.length, taught),
      },
      certificate: summariseCertificate(buildCertificate(req.user.id)),
    })
  })
}

function summariseCertificate(cert) {
  if (!cert) return null
  return {
    eligible: cert.eligible,
    title: cert.title,
    term: cert.term.label,
    topics: cert.stats.topics,
    sessionsTaught: cert.stats.sessionsTaught,
  }
}

function avg(nums) {
  if (!nums.length) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function buildBadges(sessions, ratings, teachable) {
  const badges = []
  if (sessions >= 1) badges.push({ id: 'swap', label: 'First GapSwap' })
  if (ratings >= 1) badges.push({ id: 'helpful', label: 'Helpful peer' })
  if (teachable.length) badges.push({ id: 'teacher', label: `Can teach ${teachable[0]}` })
  badges.push({ id: 'verified', label: 'University email' })
  return badges
}

export function shapeSession(s) {
  return {
    id: s.id,
    matchId: s.match_id,
    partnerName: s.partner_name,
    partnerColor: s.partner_color,
    gapConcept: s.gap_concept,
    teachConcept: s.teach_concept,
    startsAt: s.starts_at,
    durationMin: s.duration_min,
    format: s.format,
    meetingUrl: s.meeting_url,
    agenda: parseJson(s.agenda, []),
    status: s.status,
    rolePhase: s.role_phase,
  }
}

export { counts, upcoming }
