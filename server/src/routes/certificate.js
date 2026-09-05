import { requireAuth } from '../middleware/auth.js'
import { buildCertificate, findUserIdFromCredential } from '../services/certificate.js'

function payload(cert, { publicView = false } = {}) {
  if (!cert) return null
  return {
    id: cert.id,
    title: cert.title,
    eligible: cert.eligible,
    term: cert.term,
    holder: publicView
      ? { name: cert.holder.name, university: cert.holder.university, course: cert.holder.course }
      : cert.holder,
    stats: cert.stats,
    progress: cert.progress,
    cvBullet: publicView ? undefined : cert.cvBullet,
    linkedinText: publicView ? undefined : cert.linkedinText,
    disclaimer: cert.disclaimer,
  }
}

export function certificateRoutes(app) {
  app.get('/api/me/certificate', requireAuth, (req, res) => {
    res.json(payload(buildCertificate(req.user.id)))
  })

  app.get('/api/credentials/:code', (req, res) => {
    const userId = findUserIdFromCredential(req.params.code)
    if (!userId) return res.status(404).json({ error: 'Credential not found' })
    const cert = buildCertificate(userId)
    if (!cert?.eligible) return res.status(404).json({ error: 'Credential not issued yet' })
    res.json(payload(cert, { publicView: true }))
  })
}
