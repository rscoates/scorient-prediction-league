/**
 * Unit tests for scoring utility functions (frontend mirror of backend logic).
 */

// Mirrors the backend scoring rules
function matchPredictionPoints(
  predHome: number | null,
  predAway: number | null,
  actualHome: number | null,
  actualAway: number | null,
): { points: number; rag: 'green' | 'amber' | 'red' | null } {
  if (actualHome === null || actualAway === null) return { points: 0, rag: null }
  if (predHome === null || predAway === null) return { points: 0, rag: 'red' }
  const sign = (h: number, a: number) => (h > a ? 1 : h < a ? -1 : 0)
  if (predHome === actualHome && predAway === actualAway) return { points: 5, rag: 'green' }
  if (sign(predHome, predAway) === sign(actualHome, actualAway)) return { points: 3, rag: 'amber' }
  return { points: 0, rag: 'red' }
}

describe('matchPredictionPoints', () => {
  test('correct scoreline gives 5 and green', () => {
    const r = matchPredictionPoints(2, 1, 2, 1)
    expect(r.points).toBe(5)
    expect(r.rag).toBe('green')
  })

  test('correct result gives 3 and amber', () => {
    const r = matchPredictionPoints(1, 0, 3, 1)
    expect(r.points).toBe(3)
    expect(r.rag).toBe('amber')
  })

  test('correct draw gives 3 and amber', () => {
    const r = matchPredictionPoints(1, 1, 0, 0)
    expect(r.points).toBe(3)
    expect(r.rag).toBe('amber')
  })

  test('wrong result gives 0 and red', () => {
    const r = matchPredictionPoints(2, 0, 1, 2)
    expect(r.points).toBe(0)
    expect(r.rag).toBe('red')
  })

  test('match not played gives 0 and null rag', () => {
    const r = matchPredictionPoints(1, 0, null, null)
    expect(r.points).toBe(0)
    expect(r.rag).toBeNull()
  })

  test('no prediction gives 0 and red', () => {
    const r = matchPredictionPoints(null, null, 2, 1)
    expect(r.points).toBe(0)
    expect(r.rag).toBe('red')
  })
})

// Bonus points
function bonusGoalsPoints(pred: number | null, actual: number | null): number {
  if (pred === null || actual === null) return 0
  const diff = Math.abs(pred - actual)
  if (diff === 0) return 20
  if (diff <= 5) return 10
  return 0
}

function bonusRedCardsPoints(pred: number | null, actual: number | null): number {
  if (pred === null || actual === null) return 0
  const diff = Math.abs(pred - actual)
  if (diff === 0) return 10
  if (diff <= 1) return 5
  return 0
}

describe('bonus goals points', () => {
  test('exact gives 20', () => expect(bonusGoalsPoints(150, 150)).toBe(20))
  test('within 5 gives 10', () => expect(bonusGoalsPoints(150, 154)).toBe(10))
  test('outside 5 gives 0', () => expect(bonusGoalsPoints(150, 156)).toBe(0))
  test('null gives 0', () => expect(bonusGoalsPoints(null, 150)).toBe(0))
})

describe('bonus red cards points', () => {
  test('exact gives 10', () => expect(bonusRedCardsPoints(5, 5)).toBe(10))
  test('within 1 gives 5', () => expect(bonusRedCardsPoints(5, 6)).toBe(5))
  test('outside 1 gives 0', () => expect(bonusRedCardsPoints(5, 7)).toBe(0))
})
