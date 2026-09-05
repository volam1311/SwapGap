import { db } from '../db.js'
import { FALLBACK_CHECKPOINTS, FALLBACK_DIAGNOSIS, looksLikeNestedLoop } from './fallback.js'

const EXTRA_KEYS = {
  'nested-loops': ['inner loop', 'nested loop', 'nested for', 'loop restart', 'inner for'],
  'loop-reset': ['reset', 'restart', 'start again'],
  loops: ['for loop', 'while loop', 'iteration', 'iterate', 'loop'],
  'while-loops': ['while'],
  functions: ['function', 'def ', 'parameter', 'argument', 'callable'],
  'return-values': ['return value', 'return vs print', 'returning', 'return'],
  scope: ['scope', 'local variable', 'global'],
  lists: ['list', 'array', 'append', 'index error', 'indexing'],
  variables: ['variable', 'assignment'],
  assignment: ['assign'],
  conditionals: ['if statement', 'elif', 'else', 'conditional'],
  booleans: ['boolean', 'true or false'],
  operators: ['operator', '==', '!='],
  strings: ['string', 'concatenate'],
  tracing: ['trace', 'what does this print', 'output'],
  'off-by-one': ['off by one', 'off-by-one', 'range('],
  accumulators: ['accumulator', 'running total'],
  io: ['input', 'user input'],
  print: ['print statement', 'printing'],
  comments: ['comment'],
  'data-types': ['data type', 'int', 'type error'],
  indentation: ['indent', 'indentation'],
}

export function listConcepts() {
  return db.prepare('SELECT id, name, prereq_id, sort_order, on_gps FROM concepts ORDER BY sort_order').all()
}

export function conceptById(id) {
  if (!id) return null
  return db.prepare('SELECT id, name, prereq_id, sort_order, on_gps FROM concepts WHERE id = ?').get(id)
}

export function conceptByName(name) {
  if (!name) return null
  return db
    .prepare('SELECT id, name, prereq_id, sort_order, on_gps FROM concepts WHERE lower(name) = lower(?)')
    .get(String(name).trim())
}

export function inferConcept(...parts) {
  const q = parts
    .flat()
    .filter(Boolean)
    .map((p) => String(p))
    .join(' ')
    .toLowerCase()
  if (!q.trim()) return null

  let best = null
  let bestScore = 0
  for (const c of listConcepts()) {
    let score = 0
    const name = c.name.toLowerCase()
    if (q.includes(name)) score += name.length + 12
    for (const key of EXTRA_KEYS[c.id] || []) {
      if (q.includes(key)) score += key.length
    }
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return bestScore > 0 ? best : null
}

export function nextOnPath(concept) {
  if (!concept) return null
  return db
    .prepare('SELECT id, name FROM concepts WHERE prereq_id = ? AND on_gps = 1 ORDER BY sort_order LIMIT 1')
    .get(concept.id)
}

export function prereqOf(concept) {
  if (!concept?.prereq_id) return null
  return conceptById(concept.prereq_id)
}

export function upsertUserConcept(userId, conceptId, status, extra = {}, { overwriteMastered = true } = {}) {
  if (!userId || !conceptId) return
  const existing = db
    .prepare('SELECT status, verified FROM user_concepts WHERE user_id = ? AND concept_id = ?')
    .get(userId, conceptId)
  if (!overwriteMastered && existing?.status === 'mastered') return
  db.prepare(
    `
    INSERT INTO user_concepts (user_id, concept_id, status, confidence, evidence, verified)
    VALUES (@user_id, @concept_id, @status, @confidence, @evidence, @verified)
    ON CONFLICT(user_id, concept_id) DO UPDATE SET
      status = CASE
        WHEN user_concepts.status = 'mastered' AND @overwrite = 0 THEN user_concepts.status
        ELSE excluded.status
      END,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      verified = CASE
        WHEN user_concepts.status = 'mastered' AND @overwrite = 0 THEN user_concepts.verified
        ELSE excluded.verified
      END
  `,
  ).run({
    user_id: userId,
    concept_id: conceptId,
    status,
    confidence: extra.confidence || '',
    evidence: extra.evidence || '',
    verified: extra.verified || 0,
    overwrite: overwriteMastered ? 1 : 0,
  })
}

export function hintConceptFromActivity(userId, concept, status, evidence = '') {
  if (!concept) return
  const existing = db
    .prepare('SELECT status FROM user_concepts WHERE user_id = ? AND concept_id = ?')
    .get(userId, concept.id)
  if (existing) return
  upsertUserConcept(userId, concept.id, status, { confidence: 'Unsure', evidence }, { overwriteMastered: false })
}

export function markGapFromQuestion(userId, concept, evidence = '') {
  if (!concept) return
  upsertUserConcept(
    userId,
    concept.id,
    'gap',
    { confidence: 'Unsure', evidence, verified: 0 },
    { overwriteMastered: false },
  )
}

export function checkpointsForQuestion(question, concept) {
  if (concept?.id === 'nested-loops' || looksLikeNestedLoop(question)) {
    return FALLBACK_CHECKPOINTS.map((c) => ({
      prompt: c.prompt,
      problem: c.problem,
      code: c.code,
      checking: 'Checking iteration count… loop reset… transfer.',
    }))
  }
  const topic = concept?.name || 'this idea'
  const problem = question || `Explain ${topic} as you understand it.`
  return [
    {
      prompt: `In your own words, what is ${topic} doing in this problem?`,
      problem,
      code: '',
      checking: 'Locating the gap…',
    },
    {
      prompt: `What do you predict happens next, and why?`,
      problem,
      code: '',
      checking: 'Checking the prediction against the concept…',
    },
    {
      prompt: `Which step feels least certain? That is usually the misconception.`,
      problem,
      code: '',
      checking: 'Pinning the shaky step…',
    },
  ]
}

export function cloneFallbackDiagnosis(overrides = {}) {
  const diagnosis = JSON.parse(JSON.stringify(FALLBACK_DIAGNOSIS))
  if (overrides.confidence) diagnosis.evidence.confidence = overrides.confidence
  if (overrides.reasoning) diagnosis.evidence.reasoning = overrides.reasoning
  if (overrides.prediction) diagnosis.evidence.prediction = overrides.prediction
  return diagnosis
}

export function diagnosisFromEvidence({ concept, question, conversation = [], confidence, reasoning } = {}) {
  const answers = conversation.map((c) => c.answer).filter(Boolean)
  const lastAnswer = answers[answers.length - 1] || ''
  if (concept?.id === 'nested-loops' || looksLikeNestedLoop(question)) {
    return cloneFallbackDiagnosis({
      confidence,
      reasoning: reasoning || lastAnswer || undefined,
      prediction: answers[0] || question || undefined,
    })
  }

  const topic = concept?.name || 'this idea'
  const prereq = prereqOf(concept)
  const next = nextOnPath(concept)
  return {
    understood: [],
    developing: [],
    gap: {
      concept: topic,
      conceptId: concept?.id || '',
      misconception: question
        ? `You asked about ${topic}: “${String(question).slice(0, 160)}”. The checkpoints suggest the underlying idea is still shaky.`
        : `The checkpoints suggest ${topic} is the current gap.`,
      whyItMatters: concept
        ? `${topic} sits on the IFB104 path. Until it clicks, later topics keep surprising you — and a 20-minute peer swap is more useful than another generic tutorial.`
        : 'Name the lecture topic if you can, then a peer in the same unit can walk a tiny example with you.',
    },
    nextConcept: next?.name || '',
    confidence: 0.72,
    evidence: {
      prediction: answers[0] || question || `Tried to explain ${topic}.`,
      reasoning: reasoning || lastAnswer || 'Unsure which step is wrong.',
      confidence: confidence || 'Unsure',
    },
    plan: {
      alreadyKnows: prereq
        ? `${prereq.name} is the step before this. We have not marked it mastered until a diagnostic says so.`
        : 'You brought a real question — that is enough to start.',
      misunderstood: `The exact rule behind ${topic}, not just the surface syntax.`,
      whyItMatters: `Peers who already have ${topic} can walk a tiny example with you instead of giving the assignment answer.`,
      learnFirst: `Name the rule for ${topic} in one sentence, then trace one small example.`,
      explanation: `Your question is the map pin. Practice one worked example of ${topic}, then try a slightly different one without looking.`,
      practice: [
        `Restate ${topic} in your own words without code.`,
        question ? `Retry this: ${String(question).slice(0, 120)}` : `Invent a 3-line example that uses ${topic}.`,
      ],
      resources: [
        { title: 'Python Tutor — visual trace', url: 'https://pythontutor.com/' },
        { title: 'Ask a peer on the questions board', url: '/questions' },
      ],
      peerRecommended: true,
    },
  }
}

export function resolveGapConcept(diagnosis, fallbackText) {
  return (
    conceptById(diagnosis?.gap?.conceptId) ||
    conceptByName(diagnosis?.gap?.concept) ||
    inferConcept(diagnosis?.gap?.concept, fallbackText)
  )
}
