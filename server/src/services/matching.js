import { db, parseJson } from '../db.js'
import { DEMO_SLOTS } from '../seed.js'

function conceptMap(userId) {
  const rows = db
    .prepare(
      `SELECT uc.*, c.name FROM user_concepts uc
       JOIN concepts c ON c.id = uc.concept_id
       WHERE uc.user_id = ?`,
    )
    .all(userId)
  return Object.fromEntries(rows.map((r) => [r.concept_id, r]))
}

function overlap(a, b) {
  const as = new Set(parseJson(a, []))
  const bs = parseJson(b, [])
  return bs.filter((id) => as.has(id))
}

const DEMO_TRUST = {
  alex: { sessionsOnConcept: 14, passRate: 86, onTimeRate: 100 },
  priya: { sessionsOnConcept: 9, passRate: 81, onTimeRate: 96 },
  jordan: { sessionsOnConcept: 6, passRate: 74, onTimeRate: 92 },
  sam: { sessionsOnConcept: 4, passRate: 70, onTimeRate: 88 },
  maya: { sessionsOnConcept: 8, passRate: 83, onTimeRate: 98 },
}

function trustStats(userId, theyMasterGap) {
  const t = DEMO_TRUST[userId] || { sessionsOnConcept: 3, passRate: 72, onTimeRate: 90 }
  return {
    sessionsOnConcept: theyMasterGap ? t.sessionsOnConcept : 0,
    passRate: theyMasterGap ? t.passRate : null,
    onTimeRate: t.onTimeRate,
  }
}

export function rankMatches(me, mode = 'swap') {
  const blocked = new Set(
    db
      .prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?')
      .all(me.id)
      .map((r) => r.blocked_id),
  )

  const myConcepts = conceptMap(me.id)
  const myGap = Object.values(myConcepts).find((c) => c.status === 'gap' && c.concept_id === 'nested-loops')
    || Object.values(myConcepts).find((c) => c.status === 'gap')
  const opted = new Set(parseJson(me.teachable, []).map((n) => String(n).toLowerCase()))
  const myTeach =
    Object.values(myConcepts).find(
      (c) => c.status === 'mastered' && (opted.has(c.name.toLowerCase()) || opted.has(c.concept_id)),
    ) ||
    (opted.size
      ? Object.values(myConcepts).find((c) => opted.has(c.name.toLowerCase()) || opted.has(c.concept_id))
      : null)

  const others = db
    .prepare('SELECT * FROM users WHERE id != ?')
    .all(me.id)
    .filter((u) => !blocked.has(u.id))

  const results = others.map((them) => {
    const theirs = conceptMap(them.id)
    const reasons = []
    const theyMasterGap = myGap && theirs[myGap.concept_id]?.status === 'mastered'
    const theyNeedMine = myTeach && (theirs[myTeach.concept_id]?.status === 'gap' || theirs[myTeach.concept_id]?.status === 'developing')
    const reciprocalGap = myTeach && theirs[myTeach.concept_id]?.status === 'gap'
    const sameCourse = them.course_code === me.course_code
    const sharedSlots = overlap(me.availability, them.availability)
    const styleFit = them.learning_style === me.learning_style

    let score = 23
    if (theyMasterGap) {
      score += 28
      reasons.push(`Verified on ${myGap.name}`)
    }
    if (reciprocalGap && (mode === 'swap' || mode === 'help')) {
      score += 18
      reasons.push(`Needs a check on ${myTeach.name}`)
    } else if (theyNeedMine && (mode === 'swap' || mode === 'help')) {
      score += 12
      reasons.push(`Needs a check on ${myTeach.name}`)
    }
    if (sameCourse) {
      score += 10
      reasons.push('Same course')
    }
    if (theyMasterGap && theirs[myGap.concept_id]?.verified) {
      score += 6
      reasons.push('Passed transfer check')
    }
    if (sharedSlots.length) score += 4
    if (styleFit) score += 3
    score += Math.round((them.reliability || 4) - 3)
    score = Math.min(99, score)

    const theirGap = Object.values(theirs).find((c) => c.status === 'gap')
    const trust = trustStats(them.id, theyMasterGap)

    return {
      userId: them.id,
      name: them.name,
      avatarColor: them.avatar_color,
      initial: them.name.trim()[0],
      course: `${them.course_code} — ${them.course}`,
      preference: them.preference,
      learningStyle: them.learning_style,
      reliability: them.reliability,
      score,
      reasons,
      theyCanTeach: theyMasterGap ? myGap?.name : Object.values(theirs).find((c) => c.status === 'mastered')?.name,
      theyNeed: theirGap?.name || null,
      youNeed: myGap?.name || null,
      youCanTeach: myTeach?.name || null,
      reciprocal: Boolean(theyMasterGap && reciprocalGap),
      sharedSlots: DEMO_SLOTS().filter((s) => sharedSlots.includes(s.id)),
      verified: Boolean(theyMasterGap && theirs[myGap.concept_id]?.verified),
      sessionsOnConcept: trust.sessionsOnConcept,
      passRate: trust.passRate,
      onTimeRate: trust.onTimeRate,
      modeHint: theyMasterGap && theyNeedMine ? 'swap' : theyMasterGap ? 'help' : 'group',
    }
  })

  if (mode === 'swap') {
    results.sort((a, b) => Number(b.reciprocal) - Number(a.reciprocal) || b.score - a.score)
  } else if (mode === 'mentor') {
    results.sort((a, b) => b.reliability - a.reliability || b.score - a.score)
  } else if (mode === 'group') {
    return results
      .filter((r) => r.theyNeed && r.theyNeed === r.youNeed)
      .sort((a, b) => b.score - a.score)
  } else {
    results.sort((a, b) => b.score - a.score)
  }

  return results
}

export function defaultAgenda(youName, partnerName, youTeach, theyTeach, duration = 20) {
  const half = Math.max(5, Math.floor(duration / 2))
  return [
    { minutes: half, title: `${youName} facilitates a scripted check on ${youTeach}`, owner: youName },
    { minutes: duration - half, title: `${partnerName} facilitates a scripted check on ${theyTeach}`, owner: partnerName },
  ]
}
