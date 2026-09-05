import { randomUUID } from 'node:crypto'
import { db, nowIso } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { conceptByName, inferConcept, listConcepts, markGapFromQuestion } from '../services/concepts.js'

export function questionRoutes(app) {
  app.get('/api/questions', requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT q.*, u.name AS author_name, u.avatar_color AS author_color
      FROM questions q JOIN users u ON u.id = q.author_id
      ORDER BY q.created_at DESC
    `).all()
    const answers = db.prepare(`
      SELECT a.*, u.name AS author_name FROM answers a JOIN users u ON u.id = a.author_id
    `).all()
    const byQ = {}
    for (const a of answers) {
      byQ[a.question_id] = byQ[a.question_id] || []
      byQ[a.question_id].push({
        id: a.id,
        authorName: a.author_name,
        body: a.body,
        createdAt: a.created_at,
      })
    }
    res.json({
      concepts: listConcepts(),
      questions: rows.map((q) => ({
        id: q.id,
        authorName: q.author_name,
        authorColor: q.author_color,
        concept: q.concept,
        title: q.title,
        body: q.body,
        status: q.status,
        createdAt: q.created_at,
        answers: byQ[q.id] || [],
      })),
    })
  })

  app.post('/api/questions', requireAuth, (req, res) => {
    const { title, body, concept } = req.body || {}
    if (!title) return res.status(400).json({ error: 'Title required' })
    const picked = conceptByName(concept) || inferConcept(concept, title, body)
    const conceptName = (concept && String(concept).trim()) || picked?.name || ''
    const id = randomUUID()
    db.prepare(`
      INSERT INTO questions (id, author_id, concept, title, body, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
    `).run(id, req.user.id, conceptName, title, body || '', nowIso())
    markGapFromQuestion(req.user.id, picked, title)
    res.json({ id, concept: conceptName })
  })

  app.post('/api/questions/:id/answers', requireAuth, (req, res) => {
    const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)
    if (!q) return res.status(404).json({ error: 'Question not found' })
    const id = randomUUID()
    db.prepare(`
      INSERT INTO answers (id, question_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)
    `).run(id, q.id, req.user.id, req.body?.body || '', nowIso())
    if (q.author_id !== req.user.id) {
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, body, link, read, created_at)
        VALUES (?, ?, 'board', 'New response to your question', ?, '/questions', 0, ?)
      `).run(randomUUID(), q.author_id, req.body?.body?.slice(0, 80) || 'Someone replied.', nowIso())
    }
    res.json({ id })
  })
}

export function notificationRoutes(app) {
  app.get('/api/notifications', requireAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
    `).all(req.user.id)
    res.json({
      unread: rows.filter((n) => !n.read).length,
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        read: Boolean(n.read),
        createdAt: n.created_at,
      })),
    })
  })

  app.post('/api/notifications/read', requireAuth, (req, res) => {
    if (req.body?.id) {
      db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.body.id, req.user.id)
    } else {
      db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id)
    }
    res.json({ ok: true })
  })
}

export function reportRoutes(app) {
  app.post('/api/reports', requireAuth, (req, res) => {
    const { targetId, reason, block } = req.body || {}
    if (!targetId) return res.status(400).json({ error: 'targetId required' })
    db.prepare(`
      INSERT INTO reports (id, reporter_id, target_id, reason, created_at) VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), req.user.id, targetId, reason || '', nowIso())
    if (block) {
      db.prepare('INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').run(req.user.id, targetId)
    }
    res.json({ ok: true })
  })
}
