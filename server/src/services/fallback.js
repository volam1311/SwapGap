export const NESTED_LOOP_CODE = `for i in range(2):
    for j in range(3):
        print(i, j)`

export const FALLBACK_CHECKPOINTS = [
  {
    step: 1,
    prompt: 'How many times does the outer loop run?',
    code: NESTED_LOOP_CODE,
    problem: 'Why does this nested loop produce six outputs?',
    expected: '2',
    hint: 'Look at range(2) on the outer loop.',
  },
  {
    step: 2,
    prompt: 'What is printed the first time the inner loop body runs?',
    code: NESTED_LOOP_CODE,
    problem: 'Trace the first pass through both loops.',
    expected: '0 0',
    hint: 'i starts at 0 and j starts at 0.',
  },
  {
    step: 3,
    prompt: 'When i becomes 1, does j continue from 3 or start again at 0?',
    code: NESTED_LOOP_CODE,
    problem: 'Why does the inner loop restart every time?',
    expected: 'start again at 0',
    hint: 'Each new outer-loop iteration creates a fresh inner loop.',
  },
]

export const FALLBACK_DIAGNOSIS = {
  understood: ['Variables', 'Functions', 'How loops make predictions / iterate'],
  developing: ['Loops'],
  gap: {
    concept: 'Nested loops',
    conceptId: 'nested-loops',
    misconception:
      'You understand iteration, but expect the inner loop to continue instead of restarting.',
    whyItMatters:
      'Nested loops power grids, tables, images and search. If the inner loop does not reset, you skip combinations or crash into the wrong counts.',
  },
  nextConcept: 'Lists',
  confidence: 0.86,
  evidence: {
    prediction: 'Expected j to keep climbing (0,1,2,3…) instead of restarting (0,1,2 then 0,1,2).',
    reasoning: 'Thought the inner loop would continue counting.',
    confidence: 'Unsure',
  },
  plan: {
    alreadyKnows: 'You can trace a single loop and you know how functions package behaviour.',
    misunderstood: 'The inner loop is re-created on every outer iteration, so its counter resets.',
    whyItMatters:
      'Until this clicks, nested processing (pixels, tables, pair matching) will keep surprising you.',
    learnFirst: 'Watch one outer step, then a full inner pass, then the reset.',
    explanation:
      'range(3) is a brand-new sequence each time the outer body runs. j does not remember the previous outer lap.',
    practice: [
      'Trace for i in range(2): for j in range(3): print(i, j)',
      'Predict output of for i in range(1, 3): for j in range(2): print(i, j)',
    ],
    resources: [
      { title: 'Python nested loops — visual trace', url: 'https://pythontutor.com/' },
      { title: 'IFB104 workshop: iteration patterns', url: '/help' },
    ],
    peerRecommended: true,
  },
}

export const FALLBACK_QUIZ = [
  {
    id: 'print',
    prompt: 'What will this code print?',
    code: `for i in range(1, 3):\n    for j in range(2):\n        print(i, j)`,
    type: 'short',
    answer: '1 0\n1 1\n2 0\n2 1',
  },
  {
    id: 'why',
    prompt: 'Why does the inner loop restart?',
    type: 'short',
    answer:
      'Each outer-loop iteration starts a new inner loop, so the inner counter is created again from the beginning.',
  },
]

export const COHORT_INSIGHTS = [
  { concept: 'Loop reset', struggling: 37, developing: 18, level: 'high' },
  { concept: 'Loop boundaries', struggling: 29, developing: 22, level: 'high' },
  { concept: 'Function parameters', struggling: 24, developing: 31, level: 'medium' },
  { concept: 'Off-by-one', struggling: 19, developing: 27, level: 'medium' },
  { concept: 'Return vs print', struggling: 14, developing: 21, level: 'low' },
]

export function looksLikeNestedLoop(question = '') {
  const q = String(question || '').toLowerCase()
  return (
    q.includes('inner loop') ||
    q.includes('nested loop') ||
    q.includes('nested for') ||
    (q.includes('restart') && q.includes('loop'))
  )
}

export function gradeShort(expected, given) {
  const a = String(expected || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const b = String(given || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  if (!b) return false
  if (a.includes(b) || b.includes(a)) return true
  const keywords = a.split(/[^a-z0-9]+/).filter((w) => w.length > 3)
  const hits = keywords.filter((w) => b.includes(w)).length
  return hits >= Math.max(1, Math.ceil(keywords.length * 0.4))
}
