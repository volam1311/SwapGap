import { db, parseJson, publicUser } from '../db.js'

export function academicTerm(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const semester = month >= 7 ? 2 : 1
  return {
    year,
    semester,
    label: `Semester ${semester}, ${year}`,
    issueMonth: semester === 1 ? 6 : 11,
    issueMonthLabel: semester === 1 ? `June ${year}` : `November ${year}`,
    teachingPeriod: semester === 1 ? `February–June ${year}` : `July–November ${year}`,
  }
}

export function credentialId(userId, year, semester) {
  const short = String(userId)
    .replace(/-/g, '')
    .slice(0, 8)
    .toUpperCase()
  return `GS-${year}S${semester}-${short}`
}

export function findUserIdFromCredential(code) {
  const m = String(code || '')
    .trim()
    .toUpperCase()
    .match(/^GS-(\d{4})S([12])-([A-Z0-9]+)$/)
  if (!m) return null
  const short = m[3]
  const users = db.prepare('SELECT id FROM users').all()
  return users.find((u) => u.id.replace(/-/g, '').slice(0, 8).toUpperCase() === short)?.id || null
}

function avg(nums) {
  if (!nums.length) return 0
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

export function buildCertificate(userId) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!row) return null
  const term = academicTerm()
  const id = credentialId(userId, term.year, term.semester)
  const teachable = parseJson(row.teachable, [])
  const courseLabel = [row.course_code, row.course].filter(Boolean).join(' — ') || 'your unit'

  const sessions = db
    .prepare(
      `
      SELECT s.*, u.name AS partner_name
      FROM sessions s
      JOIN users u ON u.id = CASE WHEN s.host_id = ? THEN s.partner_id ELSE s.host_id END
      WHERE s.host_id = ? OR s.partner_id = ?
      ORDER BY s.starts_at DESC
    `,
    )
    .all(userId, userId, userId)

  const taught = []
  for (const s of sessions) {
    const topic = s.host_id === userId ? s.teach_concept : s.gap_concept
    if (topic) taught.push({ topic, status: s.status, partnerName: s.partner_name })
  }
  const taughtTopics = [...new Set(taught.map((t) => t.topic).filter(Boolean))]
  const verifiedTaught = taught.filter((t) => t.status === 'completed').length
  const supported = sessions.filter((s) => s.status === 'completed').length

  const ratings = db.prepare('SELECT * FROM ratings WHERE to_user = ?').all(userId)
  const answers = db.prepare('SELECT COUNT(*) AS n FROM answers WHERE author_id = ?').get(userId).n

  const eligible = taught.length >= 1 || ratings.length >= 1 || answers >= 1
  const title = 'Peer Teaching & Support Certificate'
  const topics = taughtTopics.length ? taughtTopics : teachable
  const cvBullet = eligible
    ? `${title}, ${term.label}, GapSwap at ${row.university || 'QUT'}. Supported peers in ${courseLabel} (${topics.join(', ') || 'core concepts'}) across ${Math.max(taught.length, supported, ratings.length)} verified scripted check${Math.max(taught.length, supported, ratings.length) === 1 ? '' : 's'}.`
    : null
  const linkedinText = eligible
    ? `${title} — ${courseLabel}\nIssued by GapSwap (${row.university || 'QUT'} peer support) · ${term.issueMonthLabel}\nCredential ID: ${id}\nFacilitated: ${topics.join(', ') || 'peer learning support'}`
    : null

  return {
    id,
    title,
    eligible,
    term,
    holder: {
      name: row.name,
      university: row.university || 'QUT',
      course: courseLabel,
      verified: Boolean(row.verified),
    },
    publicHolder: publicUser({ ...row, privacy_hide_contact: 1 }),
    stats: {
      sessionsTaught: taught.length,
      sessionsVerified: verifiedTaught,
      sessionsCompleted: supported,
      ratings: ratings.length,
      avgHelpfulness: avg(ratings.map((r) => r.helpfulness)),
      answers,
      topics,
    },
    progress: {
      teachASwap: taught.length >= 1,
      getARating: ratings.length >= 1,
      supportOnBoard: answers >= 1,
    },
    cvBullet,
    linkedinText,
    disclaimer:
      'This recognises verified peer support on GapSwap. It is not a university award, professional teaching qualification, or official academic transcript.',
  }
}
