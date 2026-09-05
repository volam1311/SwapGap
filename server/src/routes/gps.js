import { db, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { conceptById, diagnosisFromEvidence, inferConcept, listConcepts } from '../services/concepts.js'

function shapeNode(c) {
  return {
    id: c.id,
    name: c.name,
    status: c.status || 'unmapped',
    confidence: c.confidence,
    evidence: c.evidence,
  }
}

function buildPath(userId, focusConceptId) {
  const spine = db
    .prepare(
      `
      SELECT c.id, c.name, c.sort_order, c.prereq_id, uc.status, uc.confidence, uc.evidence, uc.verified
      FROM concepts c
      LEFT JOIN user_concepts uc ON uc.concept_id = c.id AND uc.user_id = ?
      WHERE c.on_gps = 1
      ORDER BY c.sort_order
    `,
    )
    .all(userId)
    .map(shapeNode)

  const path = [...spine]
  if (focusConceptId && !path.some((n) => n.id === focusConceptId)) {
    const extra = db
      .prepare(
        `
        SELECT c.id, c.name, c.sort_order, c.prereq_id, uc.status, uc.confidence, uc.evidence
        FROM concepts c
        LEFT JOIN user_concepts uc ON uc.concept_id = c.id AND uc.user_id = ?
        WHERE c.id = ?
      `,
      )
      .get(userId, focusConceptId)
    if (extra) {
      const node = shapeNode({ ...extra, status: extra.status || 'gap' })
      const prereqIdx = path.findIndex((n) => n.id === extra.prereq_id)
      if (prereqIdx >= 0) path.splice(prereqIdx + 1, 0, node)
      else path.push(node)
    }
  }

  const seen = new Set(path.map((n) => n.name.toLowerCase()))
  const openQuestions = db
    .prepare(
      `
      SELECT id, title, concept FROM questions
      WHERE author_id = ? AND status = 'open'
      ORDER BY created_at DESC LIMIT 2
    `,
    )
    .all(userId)
  for (const q of openQuestions) {
    const inferred = inferConcept(q.concept, q.title)
    if (inferred && path.some((n) => n.id === inferred.id)) {
      seen.add((q.concept || q.title || '').toLowerCase())
      continue
    }
    const label = (q.concept || q.title || '').trim()
    if (!label || seen.has(label.toLowerCase())) continue
    path.push({
      id: `q-${q.id}`,
      name: label.slice(0, 28),
      status: 'gap',
      confidence: 'Unsure',
      evidence: q.title,
    })
    seen.add(label.toLowerCase())
  }

  return path
}

export function gpsRoutes(app) {
  app.get('/api/concepts', requireAuth, (_req, res) => {
    res.json({ concepts: listConcepts() })
  })

  app.get('/api/gps', requireAuth, (req, res) => {
    const latest = db
      .prepare(
        `
      SELECT * FROM diagnostics WHERE user_id = ? AND status = 'complete'
      ORDER BY created_at DESC LIMIT 1
    `,
      )
      .get(req.user.id)

    const stored = latest ? parseJson(latest.result, null) : null
    const latestQuestion = db
      .prepare(
        `
      SELECT title, body, concept FROM questions WHERE author_id = ?
      ORDER BY created_at DESC LIMIT 1
    `,
      )
      .get(req.user.id)

    const focus =
      stored?.gap?.conceptId ||
      inferConcept(stored?.gap?.concept)?.id ||
      inferConcept(latestQuestion?.concept, latestQuestion?.title, latestQuestion?.body)?.id
    const path = buildPath(req.user.id, focus)
    const mapped = path.some((c) => c.status && c.status !== 'unmapped' && c.status !== 'next')
    const current =
      path.find((c) => c.id === focus && c.status === 'gap') ||
      path.find((c) => c.status === 'gap') ||
      path.find((c) => c.status === 'developing')
    const next = path.find((c) => c.status === 'next') || path.find((c) => c.status === 'unmapped')
    const diagnosis =
      stored ||
      (current?.id && !String(current.id).startsWith('q-')
        ? diagnosisFromEvidence({ concept: conceptById(current.id) })
        : null)
    const origin = stored ? 'diagnostic' : latestQuestion ? 'question' : diagnosis ? 'mapped' : null

    res.json({
      path,
      mapped,
      origin,
      current: current?.name || diagnosis?.gap?.concept || null,
      next: next?.name || diagnosis?.nextConcept || null,
      courseCode: req.user.courseCode || 'IFB104',
      diagnosis,
      plan: diagnosis?.plan || null,
      fromQuestion: !diagnosis && latestQuestion
        ? {
            title: latestQuestion.title,
            concept: latestQuestion.concept,
            body: latestQuestion.body,
          }
        : null,
    })
  })
}
