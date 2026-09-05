import { randomUUID } from 'node:crypto'
import { db, nowIso, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { chatJson } from '../services/openai.js'
import {
  FALLBACK_CHECKPOINTS,
  FALLBACK_DIAGNOSIS,
  looksLikeNestedLoop,
} from '../services/fallback.js'

const DIAGNOSE_SYSTEM = `You are GapSwap's Knowledge Gap Detector for university students.
Do not give the final assignment answer. Diagnose the underlying misconception.
Always reply with JSON:
{
  "action": "ask" | "complete",
  "step": number,
  "totalSteps": number,
  "prompt": "follow-up question",
  "problem": "short problem statement",
  "code": "optional code sample or empty string",
  "checking": "short status like Checking iteration count... loop reset...",
  "diagnosis": {
    "understood": ["concept"],
    "developing": ["concept"],
    "gap": { "concept": "", "conceptId": "kebab-id", "misconception": "", "whyItMatters": "" },
    "nextConcept": "",
    "confidence": 0.0,
    "evidence": { "prediction": "", "reasoning": "", "confidence": "" },
    "plan": {
      "alreadyKnows": "",
      "misunderstood": "",
      "whyItMatters": "",
      "learnFirst": "",
      "explanation": "",
      "practice": ["q"],
      "resources": [{"title": "", "url": ""}],
      "peerRecommended": true
    }
  }
}
Prefer 3 to 5 checkpoints. Map conceptId to one of: variables, functions, loops, nested-loops, lists when possible.`

function conceptByName(name) {
  if (!name) return null
  return db.prepare('SELECT id, name FROM concepts WHERE lower(name) = lower(?)').get(String(name).trim())
}

function teachOffersFor(userId, diagnosis) {
  const seen = new Set()
  const offers = []
  for (const name of diagnosis?.understood || []) {
    const row = conceptByName(name)
    if (row && !seen.has(row.id)) {
      seen.add(row.id)
      offers.push({ id: row.id, name: row.name })
    }
  }
  const user = db.prepare('SELECT teachable FROM users WHERE id = ?').get(userId)
  return {
    teachOffers: offers.slice(0, 4),
    alreadyTeaching: parseJson(user?.teachable, []),
  }
}

function completePayload(row, userId) {
  const diagnosis = parseJson(row.result, {})
  return {
    ...shapeDiagnostic(row),
    complete: true,
    diagnosis,
    ...teachOffersFor(userId, diagnosis),
  }
}

function applyDiagnosis(userId, diagnosis) {
  const gapId = diagnosis?.gap?.conceptId || 'nested-loops'
  const developing = diagnosis?.developing || []
  const understood = diagnosis?.understood || []

  const upsert = db.prepare(`
    INSERT INTO user_concepts (user_id, concept_id, status, confidence, evidence, verified)
    VALUES (@user_id, @concept_id, @status, @confidence, @evidence, @verified)
    ON CONFLICT(user_id, concept_id) DO UPDATE SET
      status = excluded.status,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      verified = excluded.verified
  `)

  for (const name of understood) {
    const row = db.prepare('SELECT id FROM concepts WHERE lower(name) = lower(?)').get(name)
    if (row) {
      upsert.run({
        user_id: userId,
        concept_id: row.id,
        status: 'mastered',
        confidence: 'Confident',
        evidence: '',
        verified: 1,
      })
    }
  }
  for (const name of developing) {
    const row = db.prepare('SELECT id FROM concepts WHERE lower(name) = lower(?)').get(name)
    if (row && row.id !== gapId) {
      upsert.run({
        user_id: userId,
        concept_id: row.id,
        status: 'developing',
        confidence: diagnosis?.evidence?.confidence || 'Unsure',
        evidence: '',
        verified: 0,
      })
    }
  }
  upsert.run({
    user_id: userId,
    concept_id: gapId,
    status: 'gap',
    confidence: diagnosis?.evidence?.confidence || 'Unsure',
    evidence: diagnosis?.gap?.misconception || '',
    verified: 1,
  })
  if (diagnosis?.nextConcept) {
    const next = db.prepare('SELECT id FROM concepts WHERE lower(name) = lower(?)').get(diagnosis.nextConcept)
    if (next) {
      upsert.run({
        user_id: userId,
        concept_id: next.id,
        status: 'next',
        confidence: '',
        evidence: '',
        verified: 0,
      })
    }
  }
}

function shapeDiagnostic(row) {
  const conversation = parseJson(row.conversation, [])
  const current = conversation[row.current_step - 1] || conversation[conversation.length - 1] || FALLBACK_CHECKPOINTS[0]
  return {
    id: row.id,
    mode: row.mode,
    question: row.question,
    status: row.status,
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    checkpoint: {
      prompt: current.prompt,
      problem: current.problem,
      code: current.code || '',
      checking: current.checking || 'Checking iteration count… loop reset… transfer.',
    },
    result: parseJson(row.result, {}),
  }
}

export function diagnoseRoutes(app) {
  app.post('/api/diagnose/start', requireAuth, async (req, res) => {
    const { mode, question, working, notes, imageDataUrl } = req.body || {}
    const id = randomUUID()
    const useFallback = !question || looksLikeNestedLoop(question)

    let conversation = FALLBACK_CHECKPOINTS.map((c) => ({
      prompt: c.prompt,
      problem: c.problem,
      code: c.code,
      checking: 'Checking iteration count… loop reset… transfer.',
    }))
    let total = conversation.length

    if (!useFallback) {
      const ai = await chatJson(
        DIAGNOSE_SYSTEM,
        `Student mode: ${mode || 'stuck'}
Question: ${question}
Current understanding / working: ${working || notes || '(none)'}
Start diagnosis. Return action=ask for checkpoint 1.`,
        imageDataUrl,
      )
      if (ai?.prompt) {
        conversation = [
          {
            prompt: ai.prompt,
            problem: ai.problem || question,
            code: ai.code || '',
            checking: ai.checking || 'Locating the gap…',
          },
        ]
        total = ai.totalSteps || 4
      }
    }

    db.prepare(`
      INSERT INTO diagnostics (
        id, user_id, course_code, mode, question, working, notes,
        conversation, current_step, total_steps, status, result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'in_progress', '{}', ?)
    `).run(
      id,
      req.user.id,
      req.user.courseCode || 'IFB104',
      mode || 'stuck',
      question || '',
      working || '',
      notes || '',
      JSON.stringify(conversation),
      total,
      nowIso(),
    )

    const row = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(id)
    res.json(shapeDiagnostic(row))
  })

  app.post('/api/diagnose/:id/answer', requireAuth, async (req, res) => {
    const row = db.prepare('SELECT * FROM diagnostics WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!row) return res.status(404).json({ error: 'Diagnostic not found' })

    const { answer, reasoning, confidence } = req.body || {}
    const conversation = parseJson(row.conversation, [])
    const stepIndex = row.current_step - 1
    if (conversation[stepIndex]) {
      conversation[stepIndex] = {
        ...conversation[stepIndex],
        answer,
        reasoning,
        confidence,
      }
    }

    const nextStep = row.current_step + 1
    const done = nextStep > row.total_steps

    if (!done && conversation.length < nextStep) {
      const ai = await chatJson(
        DIAGNOSE_SYSTEM,
        `Continue diagnosis. Previous conversation: ${JSON.stringify(conversation)}
Latest answer: ${answer}
Reasoning: ${reasoning}
Confidence: ${confidence}
Return the next checkpoint (action=ask) or complete if you can diagnose.`,
      )
      if (ai?.action === 'complete' && ai.diagnosis) {
        applyDiagnosis(req.user.id, ai.diagnosis)
        db.prepare(`
          UPDATE diagnostics SET conversation = ?, status = 'complete', result = ? WHERE id = ?
        `).run(JSON.stringify(conversation), JSON.stringify(ai.diagnosis), row.id)
        const updated = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(row.id)
        return res.json(completePayload(updated, req.user.id))
      }
      conversation.push({
        prompt: ai?.prompt || FALLBACK_CHECKPOINTS[Math.min(nextStep - 1, 2)].prompt,
        problem: ai?.problem || row.question,
        code: ai?.code || FALLBACK_CHECKPOINTS[0].code,
        checking: ai?.checking || 'Narrowing the misconception…',
      })
    }

    if (done) {
      const diagnosis = FALLBACK_DIAGNOSIS
      diagnosis.evidence.confidence = confidence || 'Unsure'
      diagnosis.evidence.reasoning = reasoning || diagnosis.evidence.reasoning
      applyDiagnosis(req.user.id, diagnosis)
      db.prepare(`
        UPDATE diagnostics SET conversation = ?, current_step = ?, status = 'complete', result = ? WHERE id = ?
      `).run(JSON.stringify(conversation), row.total_steps, JSON.stringify(diagnosis), row.id)
      const updated = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(row.id)
      return res.json(completePayload(updated, req.user.id))
    }

    db.prepare(`UPDATE diagnostics SET conversation = ?, current_step = ? WHERE id = ?`).run(
      JSON.stringify(conversation),
      nextStep,
      row.id,
    )
    const updated = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(row.id)
    res.json({ ...shapeDiagnostic(updated), complete: false })
  })

  app.get('/api/diagnose/:id', requireAuth, (req, res) => {
    const row = db.prepare('SELECT * FROM diagnostics WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
    if (!row) return res.status(404).json({ error: 'Diagnostic not found' })
    if (row.status === 'complete') return res.json(completePayload(row, req.user.id))
    res.json(shapeDiagnostic(row))
  })
}
