import { randomUUID } from 'node:crypto'
import { db, nowIso, parseJson } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { chatJson } from '../services/openai.js'
import {
  checkpointsForQuestion,
  conceptByName,
  diagnosisFromEvidence,
  ensureNamedConcept,
  inferConcept,
  hintConceptFromActivity,
  isCatalogCourse,
  listConcepts,
  resolveGapConcept,
  shortTopic,
  upsertUserConcept,
} from '../services/concepts.js'

function courseLabel(code, name) {
  return [code, name].filter(Boolean).join(' — ')
}

function diagnoseSystem(unitLabel, courseCode) {
  const catalog = isCatalogCourse(courseCode)
    ? listConcepts(courseCode)
        .map((c) => c.id)
        .join(', ')
    : ''
  const mapping = catalog
    ? `If this is IFB104, map conceptId to one of: ${catalog} when it fits.`
    : `Name the gap as a short topic in this unit. conceptId should be kebab-case for that topic. Do not reuse nested loops, functions, or other IFB104 programming examples unless the student actually asked about them.`
  return `You are GapSwap's Knowledge Gap Detector for university students.
Unit: ${unitLabel || 'not specified'}.
Do not give the final assignment answer. Diagnose the underlying misconception.
Write checkpoints about THEIR question and working. Never reuse a nested-loop tracing exercise unless they asked about nested loops.
Always reply with JSON:
{
  "action": "ask" | "complete",
  "step": number,
  "totalSteps": number,
  "prompt": "follow-up question",
  "problem": "short problem statement about the student's question",
  "code": "optional code sample or empty string",
  "checking": "short status like Locating the gap…",
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
Prefer 3 to 5 checkpoints. ${mapping}`
}

function namedConcept(name, courseCode) {
  return conceptByName(name, courseCode) || ensureNamedConcept(name, courseCode)
}

function teachOffersFor(userId, diagnosis, courseCode) {
  const seen = new Set()
  const offers = []
  for (const name of diagnosis?.understood || []) {
    const row = namedConcept(name, courseCode)
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
    ...teachOffersFor(userId, diagnosis, row.course_code),
  }
}

function applyDiagnosis(userId, diagnosis, fallbackText, courseCode) {
  const gap = resolveGapConcept(diagnosis, fallbackText, courseCode)
  const developing = diagnosis?.developing || []
  const understood = diagnosis?.understood || []

  for (const name of understood) {
    const row = namedConcept(name, courseCode)
    if (row) {
      upsertUserConcept(userId, row.id, 'mastered', { confidence: 'Confident', verified: 1 })
    }
  }
  for (const name of developing) {
    const row = namedConcept(name, courseCode)
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
    if (diagnosis?.gap) {
      diagnosis.gap.conceptId = gap.id
      diagnosis.gap.concept = gap.name
    }
  }
  if (diagnosis?.nextConcept) {
    const next = namedConcept(diagnosis.nextConcept, courseCode)
    if (next) {
      upsertUserConcept(userId, next.id, 'next', {}, { overwriteMastered: false })
    }
  }
}

function genericCheckpoint(row) {
  return {
    prompt: `In your own words, what is going on in this ${row.course_code || 'unit'} question?`,
    problem: row.question || `Explain ${shortTopic(row.question)} as you understand it.`,
    code: '',
    checking: 'Locating the gap…',
  }
}

function shapeDiagnostic(row) {
  const conversation = parseJson(row.conversation, [])
  const current =
    conversation[row.current_step - 1] || conversation[conversation.length - 1] || genericCheckpoint(row)
  return {
    id: row.id,
    mode: row.mode,
    question: row.question,
    courseCode: row.course_code || '',
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
  const unit = courseLabel(row.course_code)
  const ai = await chatJson(
    diagnoseSystem(unit, row.course_code),
    `Complete this diagnosis now (action=complete) with a filled diagnosis object.
Student unit: ${unit || 'not specified'}
Student question: ${row.question}
Working notes: ${row.working || row.notes || '(none)'}
Conversation: ${JSON.stringify(conversation)}
Latest confidence: ${extras.confidence || ''}
Latest reasoning: ${extras.reasoning || ''}`,
  )
  if (ai?.diagnosis) {
    const gap = resolveGapConcept(ai.diagnosis, row.question, row.course_code)
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
    inferConcept(row.question, row.working, row.notes, { courseCode: row.course_code }) ||
    inferConcept(conversation.map((c) => c.answer).join(' '), { courseCode: row.course_code }) ||
    ensureNamedConcept(shortTopic(row.question), row.course_code)
  return diagnosisFromEvidence({
    concept,
    question: row.question,
    conversation,
    confidence: extras.confidence,
    reasoning: extras.reasoning,
    courseLabel: unit,
    courseCode: row.course_code,
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
    const unit = courseLabel(code, courseName || req.user.course)
    const concept =
      inferConcept(asked, working, notes, { courseCode: code }) ||
      (code && !isCatalogCourse(code) ? ensureNamedConcept(shortTopic(asked), code) : null)
    let conversation = checkpointsForQuestion(asked, concept)
    let total = conversation.length

    const ai = await chatJson(
      diagnoseSystem(unit, code),
      `Student mode: ${mode || 'stuck'}
Unit: ${unit || 'not specified'}
Question: ${asked}
Current understanding / working: ${working || notes || '(none)'}
Start diagnosis. Return action=ask for checkpoint 1 about THIS question. Do not switch to nested loops unless they asked about nested loops.`,
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
        diagnoseSystem(courseLabel(row.course_code), row.course_code),
        `Continue diagnosis for unit ${row.course_code || 'unspecified'}. Previous conversation: ${JSON.stringify(conversation)}
Latest answer: ${answer}
Reasoning: ${reasoning}
Confidence: ${confidence}
Return the next checkpoint (action=ask) or complete if you can diagnose.
Stay on the student's question. Do not switch to nested loops unless they asked about nested loops.`,
      )
      if (ai?.action === 'complete' && ai.diagnosis) {
        applyDiagnosis(req.user.id, ai.diagnosis, row.question, row.course_code)
        db.prepare(`
          UPDATE diagnostics SET conversation = ?, status = 'complete', result = ? WHERE id = ?
        `).run(JSON.stringify(conversation), JSON.stringify(ai.diagnosis), row.id)
        const updated = db.prepare('SELECT * FROM diagnostics WHERE id = ?').get(row.id)
        return res.json(completePayload(updated, req.user.id))
      }
      const fallback = checkpointsForQuestion(
        row.question,
        inferConcept(row.question, { courseCode: row.course_code }),
      )
      conversation.push({
        prompt: ai?.prompt || fallback[Math.min(nextStep - 1, fallback.length - 1)].prompt,
        problem: ai?.problem || row.question,
        code: ai?.code || '',
        checking: ai?.checking || 'Narrowing the misconception…',
      })
    }

    if (done) {
      const diagnosis = await buildDiagnosis(row, conversation, extras)
      applyDiagnosis(req.user.id, diagnosis, row.question, row.course_code)
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
