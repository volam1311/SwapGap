import 'dotenv/config'
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

const port = Number(process.env.PORT) || 4000
app.listen(port, () => {
  console.log(`GapSwap API on http://localhost:${port}`)
})
