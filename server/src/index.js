import 'dotenv/config'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { db } from './db.js'
import { seed, ensureDemoPair } from './seed.js'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { diagnoseRoutes } from './routes/diagnose.js'
import { gpsRoutes } from './routes/gps.js'
import { matchRoutes } from './routes/matches.js'
import { sessionRoutes } from './routes/sessions.js'
import { questionRoutes, notificationRoutes, reportRoutes } from './routes/community.js'
import { certificateRoutes } from './routes/certificate.js'

const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
if (count === 0) {
  await seed()
  console.log('Database empty — seeded demo users (maya@qut.edu.au / alex@qut.edu.au / gapswap)')
} else if (!db.prepare('SELECT id FROM users WHERE id = ?').get('maya')) {
  ensureDemoPair()
  console.log('Restored Maya and Alex demo accounts')
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '8mb' }))

authRoutes(app)
meRoutes(app)
diagnoseRoutes(app)
gpsRoutes(app)
matchRoutes(app)
sessionRoutes(app)
questionRoutes(app)
notificationRoutes(app)
reportRoutes(app)
certificateRoutes(app)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, openai: Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-key')) })
})

const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist')
const indexHtml = path.join(clientDist, 'index.html')
if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api')) return next()
    res.sendFile(indexHtml)
  })
}

function lanAddresses() {
  const out = []
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address)
    }
  }
  return out
}

const port = Number(process.env.PORT) || 4000
app.listen(port, '0.0.0.0', () => {
  console.log(`GapSwap API on http://localhost:${port}`)
  for (const ip of lanAddresses()) {
    console.log(`GapSwap API on your network: http://${ip}:${port}`)
  }
})
