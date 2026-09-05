import jwt from 'jsonwebtoken'
import { db, meUser } from '../db.js'

const SECRET = process.env.JWT_SECRET || 'gapswap-dev-secret'

export function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: '7d' })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Sign in required' })
  try {
    const payload = jwt.verify(token, SECRET)
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub)
    if (!row) return res.status(401).json({ error: 'Account not found' })
    req.user = meUser(row)
    req.userRow = row
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired' })
  }
}
