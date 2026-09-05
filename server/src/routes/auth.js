import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db, meUser, nowIso } from '../db.js'
import { signToken } from '../middleware/auth.js'
import { ensureDemoPair } from '../seed.js'

function isUniEmail(email) {
  return /\.edu(\.[a-z]{2})?$/i.test(email) || /@(qut|uq|monash|unimelb|unsw|usyd|anu)\./i.test(email)
}

export function authRoutes(app) {
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, university, course, courseCode } = req.body || {}
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const normalisedEmail = String(email).toLowerCase().trim()
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalisedEmail)
    if (existing) return res.status(409).json({ error: 'An account with that email already exists' })

    const id = randomUUID()
    const displayName = (name && String(name).trim()) || normalisedEmail.split('@')[0]
    db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, university, course, course_code,
        avatar_color, onboarded, verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      displayName,
      normalisedEmail,
      bcrypt.hashSync(password, 10),
      university || '',
      course || '',
      courseCode || '',
      '#3d6fd8',
      isUniEmail(email) ? 1 : 0,
      nowIso(),
    )

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    const token = signToken(id)
    res.json({ token, user: meUser(row) })
  })

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {}
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase())
    if (!row || !bcrypt.compareSync(password || '', row.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' })
    }
    res.json({ token: signToken(row.id), user: meUser(row) })
  })

  app.post('/api/auth/demo', (req, res) => {
    ensureDemoPair()
    const as = String(req.body?.as || 'maya').toLowerCase()
    const id = as === 'alex' ? 'alex' : 'maya'
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
    if (!row) return res.status(500).json({ error: 'Demo user missing — run npm run seed' })
    res.json({ token: signToken(row.id), user: meUser(row) })
  })
}
