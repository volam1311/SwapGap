import { randomUUID } from 'node:crypto'
import { db, nowIso, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { chatJson } from '../services/openai.js'
import { FALLBACK_CHECKPOINTS } from '../services/fallback.js'
import {
  checkpointsForQuestion,
  conceptByName,
  diagnosisFromEvidence,
  inferConcept,
  hintConceptFromActivity,
  listConcepts,
  resolveGapConcept,
  upsertUserConcept,
} from '../services/concepts.js'

function diagnoseSystem() {
  const ids = listConcepts()
    .map((c) => c.id)
    .join(', ')
  return `You are GapSwap's Knowledge Gap Detector for university students.
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
Prefer 3 to 5 checkpoints. Map conceptId to one of: ${ids} when possible.`
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

function applyDiagnosis(userId, diagnosis, fallbackText) {
  const gap = resolveGapConcept(diagnosis, fallbackText)
  const developing = diagnosis?.developing || []
  const understood = diagnosis?.understood || []

  for (const name of understood) {
    const row = conceptByName(name)
    if (row) {
      upsertUserConcept(userId, row.id, 'mastered', { confidence: 'Confident', verified: 1 })
    }
  }
  for (const name of developing) {
    const row = conceptByName(name)
    if (row && row.id !== gap?.id) {
      upsertUserConcept(userId, row.id, 'developing', {
        confidence: diagnosis?.evidence?.confidence || 'Unsure',
      })
    }
  }
  if (gap) {
    upsertUserConcept(userId, gap.id, 'gap', {
      confidence: diagnosis?.evidence?.confidence || 'Unsure',
      evidence: diagnosis?.gap?.misconception || '',
      verified: 1,
    })
    if (diagnosis?.gap) diagnosis.gap.conceptId = gap.id
  }
  if (diagnosis?.nextConcept) {
    const next = conceptByName(diagnosis.nextConcept)
    if (next) {
      upsertUserConcept(userId, next.id, 'next', {}, { overwriteMastered: false })
    }
  }
}

function shapeDiagnostic(row) {
  const conversation = parseJson(row.conversation, [])
  const current =
    conversation[row.current_step - 1] || conversation[conversation.length - 1] || FALLBACK_CHECKPOINTS[0]
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
      checking: current.checking || 'Checking your thinking…',
    },
    result: parseJson(row.result, {}),
  }
}

async function buildDiagnosis(row, conversation, extras = {}) {
  const ai = await chatJson(
    diagnoseSystem(),
    `Complete this diagnosis now (action=complete) with a filled diagnosis object.
Student question: ${row.question}
Working notes: ${row.working || row.notes || '(none)'}
Conversation: ${JSON.stringify(conversation)}
Latest confidence: ${extras.confidence || ''}
Latest reasoning: ${extras.reasoning || ''}`,
  )
  if (ai?.diagnosis) {
    const gap = resolveGapConcept(ai.diagnosis, row.question)
    if (gap) {
      ai.diagnosis.gap = { ...ai.diagnosis.gap, concept: gap.name, conceptId: gap.id }
    }
    if (extras.confidence) {
      ai.diagnosis.evidence = {
        ...(ai.diagnosis.evidence || {}),
        confidence: extras.confidence,
        reasoning: extras.reasoning || ai.diagnosis.evidence?.reasoning || '',
      }
    }
    return ai.diagnosis
  }
  const concept =
    inferConcept(row.question, row.working, row.notes) ||
    inferConcept(conversation.map((c) => c.answer).join(' '))
  return diagnosisFromEvidence({
    concept,
    question: row.question,
    conversation,
    confidence: extras.confidence,
    reasoning: extras.reasoning,
  })
}

export function diagnoseRoutes(app) {
  app.post('/api/diagnose/start', requireAuth, async (req, res) => {
    const { mode, question, working, notes, imageDataUrl, courseCode, course } = req.body || {}
    const asked = String(question || '').trim()
    if (!asked) return res.status(400).json({ error: 'Add a question or something you want to test' })

    const code = String(courseCode || req.user.courseCode || '').trim()
    const courseName = String(course || '').trim()
    if (code || courseName) {
      const row = db.prepare('SELECT course_code, course, subjects FROM users WHERE id = ?').get(req.user.id)
      const subjects = parseJson(row?.subjects, [])
      const label = [code, courseName].filter(Boolean).join(' — ')
      if (label && !subjects.includes(label)) subjects.push(label)
      db.prepare(
        'UPDATE users SET course_code = ?, course = ?, subjects = ?, onboarded = 1 WHERE id = ?',
      ).run(code || row?.course_code || '', courseName || row?.course || '', JSON.stringify(subjects), req.user.id)
    }

    const id = randomUUID()
    const concept = inferConcept(asked, working, notes)
    let conversation = checkpointsForQuestion(asked, concept)
    let total = conversation.length

    const ai = await chatJson(
      diagnoseSystem(),
      `Student mode: ${mode || 'stuck'}
Question: ${asked}
Current understanding / working: ${working || notes || '(none)'}
Start diagnosis. Return action=ask for checkpoint 1.`,
      imageDataUrl,
    )
    if (ai?.prompt) {
      conversation = [
        {
          prompt: ai.prompt,
          problem: ai.problem || asked,
          code: ai.code || '',
          checking: ai.checking || 'Locating the gap…',
        },
      ]
      total = ai.totalSteps || 4
    }

    hintConceptFromActivity(req.user.id, concept, 'developing', asked.slice(0, 180))

    db.prepare(`
      INSERT INTO diagnostics (
        id, user_id, course_code, mode, question, working, notes,
        conversation, current_step, total_steps, status, result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'in_progress', '{}', ?)
    `).run(
      id,
      req.user.id,
      code || req.user.courseCode || '',
      mode || 'stuck',
      asked,
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
    const extras = { answer, reasoning, confidence }

    if (!done && conversation.length < nextStep) {
      const ai = await chatJson(
        diagnoseSystem(),
        `Continue diagnosis. Previous conversation: ${JSON.stringify(conversation)}
Latest answer: ${answer}
Reasoning: ${reasoning}
Confidence: ${confidence}
Return the next checkpoint (action=ask) or complete if you can diagnose.`,
      )
      if (ai?.action === 'complete' && ai.diagnosis) {
        applyDiagnosis(req.user.id, ai.diagnosis, row.question)
        db.prepare(`
          UPDATE diagnostics SET conversation = ?, status = 'complete', result = ? WHERE id = ?
        `).run(JSON.stringify(conversation), JSON.stringify(ai.diagnosis), row.id)
        const updated = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(row.id)
        return res.json(completePayload(updated, req.user.id))
      }
      const fallback = checkpointsForQuestion(row.question, inferConcept(row.question))
      conversation.push({
        prompt: ai?.prompt || fallback[Math.min(nextStep - 1, fallback.length - 1)].prompt,
        problem: ai?.problem || row.question,
        code: ai?.code || '',
        checking: ai?.checking || 'Narrowing the misconception…',
      })
    }

    if (done) {
      const diagnosis = await buildDiagnosis(row, conversation, extras)
      applyDiagnosis(req.user.id, diagnosis, row.question)
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
