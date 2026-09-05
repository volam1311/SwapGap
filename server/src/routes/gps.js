import { db, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { buildGpsPath, conceptById, diagnosisFromEvidence, inferConcept, listConcepts } from '../services/concepts.js'

export function gpsRoutes(app) {
  app.get('/api/concepts', requireAuth, (req, res) => {
    res.json({ concepts: listConcepts(req.user.courseCode) })
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

    const courseCode = req.user.courseCode || latest?.course_code || ''
    const focus =
      stored?.gap?.conceptId ||
      inferConcept(stored?.gap?.concept, { courseCode })?.id ||
      inferConcept(latestQuestion?.concept, latestQuestion?.title, latestQuestion?.body, { courseCode })?.id
    const path = buildGpsPath(req.user.id, { focusConceptId: focus, courseCode })
    const mapped = path.some((c) => c.status && c.status !== 'unmapped' && c.status !== 'next')
    const current =
      path.find((c) => c.id === focus && c.status === 'gap') ||
      path.find((c) => c.status === 'gap') ||
      path.find((c) => c.status === 'developing')
    const next = path.find((c) => c.status === 'next') || path.find((c) => c.status === 'unmapped')
    const diagnosis =
      stored ||
      (current?.id && !String(current.id).startsWith('q-')
        ? diagnosisFromEvidence({
            concept: conceptById(current.id),
            courseCode,
            courseLabel: [courseCode, req.user.course].filter(Boolean).join(' — '),
          })
        : null)
    const origin = stored ? 'diagnostic' : latestQuestion ? 'question' : diagnosis ? 'mapped' : null

    res.json({
      path,
      mapped,
      origin,
      current: current?.name || diagnosis?.gap?.concept || null,
      next: next?.name || diagnosis?.nextConcept || null,
      courseCode,
      diagnosis,
      plan: diagnosis?.plan || null,
      fromQuestion:
        !diagnosis && latestQuestion
          ? {
              title: latestQuestion.title,
              concept: latestQuestion.concept,
              body: latestQuestion.body,
            }
          : null,
    })
  })
}
