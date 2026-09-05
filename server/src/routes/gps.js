import { db, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { FALLBACK_DIAGNOSIS } from '../services/fallback.js'

export function gpsRoutes(app) {
  app.get('/api/gps', requireAuth, (req, res) => {
    const path = db.prepare(`
      SELECT c.id, c.name, c.sort_order, c.prereq_id, uc.status, uc.confidence, uc.evidence, uc.verified
      FROM concepts c
      LEFT JOIN user_concepts uc ON uc.concept_id = c.id AND uc.user_id = ?
      WHERE c.on_gps = 1
      ORDER BY c.sort_order
    `).all(req.user.id)

    const latest = db.prepare(`
      SELECT * FROM diagnostics WHERE user_id = ? AND status = 'complete'
      ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id)

    const result = latest ? parseJson(latest.result, FALLBACK_DIAGNOSIS) : FALLBACK_DIAGNOSIS
    const current = path.find((c) => c.status === 'gap') || path.find((c) => c.status === 'developing')
    const next = path.find((c) => c.status === 'next') || path.find((c) => !c.status)

    res.json({
      path: path.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status || 'next',
        confidence: c.confidence,
        evidence: c.evidence,
      })),
      current: current?.name || result.gap.concept,
      next: next?.name || result.nextConcept,
      diagnosis: result,
      plan: result.plan,
    })
  })
}
