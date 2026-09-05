export const NESTED_LOOP_CODE = `for i in range(2):
    for j in range(3):
        print(i, j)`

export const NESTED_LOOP_TRACE = [
  { i: 0, j: 0, out: '0 0' },
  { i: 0, j: 1, out: '0 1' },
  { i: 0, j: 2, out: '0 2' },
  { i: 1, j: 0, out: '1 0' },
  { i: 1, j: 1, out: '1 1' },
  { i: 1, j: 2, out: '1 2' },
]

const FACILITATOR_JOB = [
  'Ask them to explain the worked example back in their own words.',
  'Identify where they get stuck — do not lecture the theory.',
  'Stay on this pack. Do not invent a new explanation.',
]

export const NESTED_LOOP_PACK = {
  concept: 'Nested loops',
  source: 'IFB104 week 4 worked example',
  code: NESTED_LOOP_CODE,
  annotation: 'inner loop restarts here',
  trace: NESTED_LOOP_TRACE,
  prompts: [
    'In your own words, what happens to j when the outer loop moves from i = 0 to i = 1?',
    'Where did you get stuck tracing this example?',
    'If this were your assignment code, which line would you change first — and why?',
  ],
  exercise:
    'Predict the output of for i in range(1, 3): for j in range(2): print(i, j). Then explain why j starts at 0 again.',
  facilitatorJob: FACILITATOR_JOB,
}

export const FUNCTIONS_PACK = {
  concept: 'Functions',
  source: 'IFB104 week 3 worked example',
  code: `def greet(name):\n    return "Hello, " + name\n\nmessage = greet("Maya")\nprint(message)`,
  annotation: 'return sends the value back — print only shows it',
  trace: [],
  prompts: [
    'In your own words, when should this function return a value instead of printing?',
    'Where did you get stuck using this function from another piece of code?',
    'If your assignment called this function twice, what would you expect back each time?',
  ],
  exercise:
    'Write a one-line call to greet("Alex") and say what comes back. Then say what print would do instead.',
  facilitatorJob: FACILITATOR_JOB,
}

export function packForConcept(name) {
  if (/nested|inner loop/i.test(name || '')) return NESTED_LOOP_PACK
  if (/function/i.test(name || '')) return FUNCTIONS_PACK
  const concept = name || 'this concept'
  return {
    concept,
    source: 'Course-approved session pack',
    code: '',
    annotation: `Worked example for ${concept}`,
    trace: [],
    prompts: [
      `Explain ${concept} back in your own words.`,
      'Where do you get stuck on this example?',
      'What would you change in your own code, and why?',
    ],
    exercise: `Work one short exercise on ${concept} from the pack. Do not invent a new problem.`,
    facilitatorJob: FACILITATOR_JOB,
  }
}

export function sessionWorkspace(gapConcept, teachConcept) {
  const gapPack = packForConcept(gapConcept)
  const teachPack = packForConcept(teachConcept)
  const packs = { [gapPack.concept]: gapPack }
  if (teachPack.concept !== gapPack.concept) packs[teachPack.concept] = teachPack
  return {
    code: gapPack.code,
    annotation: gapPack.annotation,
    trace: gapPack.trace,
    pack: gapPack,
    packs,
  }
}

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
