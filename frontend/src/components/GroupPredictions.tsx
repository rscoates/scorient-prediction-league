import { useRef, useCallback } from 'react'
import type { Match, MatchDetail, MatchPrediction, RagStatus } from '../types'

interface Props {
  matches: Match[]
  predictions: Record<string, MatchPrediction>
  details: Record<string, MatchDetail>
  onChange: (matchUid: string, home: number | null, away: number | null) => void
  locked: boolean
  deadline: Date | null
}

function sortMatchesChronologically(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const aTime = a.start_time ? Date.parse(a.start_time) : Number.MAX_SAFE_INTEGER
    const bTime = b.start_time ? Date.parse(b.start_time) : Number.MAX_SAFE_INTEGER
    if (aTime !== bTime) return aTime - bTime
    return a.match_uid.localeCompare(b.match_uid)
  })
}

function earliestMatchTime(matches: Match[]): number {
  const firstMatch = sortMatchesChronologically(matches)[0]
  return firstMatch?.start_time ? Date.parse(firstMatch.start_time) : Number.MAX_SAFE_INTEGER
}

function actualScore(match: Match, detail?: MatchDetail): { home: number | null; away: number | null } {
  return {
    home: match.effective_home_score ?? detail?.actual_home ?? null,
    away: match.effective_away_score ?? detail?.actual_away ?? null,
  }
}

function isMatchCompleted(match: Match, detail?: MatchDetail): boolean {
  const actual = actualScore(match, detail)
  return actual.home !== null && actual.away !== null
}

// Group matches by group name, then by matchday within group
export function groupByGroup(matches: Match[]): Record<string, Match[]> {
  const groups: Record<string, Match[]> = {}
  for (const m of matches) {
    const g = m.group ?? 'Other'
    if (!groups[g]) groups[g] = []
    groups[g].push(m)
  }

  return Object.fromEntries(
    Object.entries(groups)
      .map(([group, groupMatches]) => [group, sortMatchesChronologically(groupMatches)] as const)
      .sort(([groupA, matchesA], [groupB, matchesB]) => {
        const timeDiff = earliestMatchTime(matchesA) - earliestMatchTime(matchesB)
        if (timeDiff !== 0) return timeDiff
        return groupA.localeCompare(groupB)
      })
  )
}

function ragClass(rag: RagStatus): string {
  if (rag === 'green') return 'rag-green'
  if (rag === 'amber') return 'rag-amber'
  if (rag === 'red') return 'rag-red'
  return ''
}

export interface GroupTableRow {
  team: string
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

interface MiniTableStats {
  points: number
  goalDifference: number
  goalsFor: number
}

function buildHeadToHeadMiniTable(
  tiedTeams: Set<string>,
  groupMatches: Match[],
  predictions: Record<string, MatchPrediction>,
): Map<string, MiniTableStats> {
  const mini = new Map<string, MiniTableStats>()

  for (const team of tiedTeams) {
    mini.set(team, { points: 0, goalDifference: 0, goalsFor: 0 })
  }

  for (const match of groupMatches) {
    if (!match.home_team || !match.away_team) continue
    if (!tiedTeams.has(match.home_team) || !tiedTeams.has(match.away_team)) continue

    const pred = predictions[match.match_uid]
    if (pred?.home_score === null || pred?.home_score === undefined || pred?.away_score === null || pred?.away_score === undefined) {
      continue
    }

    const homeStats = mini.get(match.home_team)
    const awayStats = mini.get(match.away_team)
    if (!homeStats || !awayStats) continue

    const homeGoals = pred.home_score
    const awayGoals = pred.away_score

    homeStats.goalsFor += homeGoals
    awayStats.goalsFor += awayGoals
    homeStats.goalDifference += homeGoals - awayGoals
    awayStats.goalDifference += awayGoals - homeGoals

    if (homeGoals > awayGoals) {
      homeStats.points += 3
    } else if (homeGoals < awayGoals) {
      awayStats.points += 3
    } else {
      homeStats.points += 1
      awayStats.points += 1
    }
  }

  return mini
}

function sortRowsByTieBreakers(
  rows: GroupTableRow[],
  groupMatches: Match[],
  predictions: Record<string, MatchPrediction>,
): GroupTableRow[] {
  const pointsGroups = new Map<number, GroupTableRow[]>()
  for (const row of rows) {
    const existing = pointsGroups.get(row.points)
    if (existing) {
      existing.push(row)
    } else {
      pointsGroups.set(row.points, [row])
    }
  }

  const orderedPointValues = Array.from(pointsGroups.keys()).sort((a, b) => b - a)
  const sorted: GroupTableRow[] = []

  for (const points of orderedPointValues) {
    const tiedRows = pointsGroups.get(points) ?? []
    if (tiedRows.length <= 1) {
      sorted.push(...tiedRows)
      continue
    }

    const tiedTeams = new Set(tiedRows.map((r) => r.team))
    const mini = buildHeadToHeadMiniTable(tiedTeams, groupMatches, predictions)

    tiedRows.sort((a, b) => {
      const aMini = mini.get(a.team) ?? { points: 0, goalDifference: 0, goalsFor: 0 }
      const bMini = mini.get(b.team) ?? { points: 0, goalDifference: 0, goalsFor: 0 }

      if (bMini.points !== aMini.points) return bMini.points - aMini.points
      if (bMini.goalDifference !== aMini.goalDifference) return bMini.goalDifference - aMini.goalDifference
      if (bMini.goalsFor !== aMini.goalsFor) return bMini.goalsFor - aMini.goalsFor

      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
      return a.team.localeCompare(b.team)
    })

    sorted.push(...tiedRows)
  }

  return sorted
}

export function buildGroupTable(groupMatches: Match[], predictions: Record<string, MatchPrediction>): GroupTableRow[] {
  const table = new Map<string, GroupTableRow>()

  const ensureTeam = (team: string | null): GroupTableRow | null => {
    if (!team) return null
    if (!table.has(team)) {
      table.set(team, {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      })
    }
    return table.get(team) ?? null
  }

  for (const match of groupMatches) {
    const home = ensureTeam(match.home_team)
    const away = ensureTeam(match.away_team)
    if (!home || !away) continue

    const pred = predictions[match.match_uid]
    if (pred?.home_score === null || pred?.home_score === undefined || pred?.away_score === null || pred?.away_score === undefined) {
      continue
    }

    const homeGoals = pred.home_score
    const awayGoals = pred.away_score

    home.played += 1
    away.played += 1
    home.goalsFor += homeGoals
    home.goalsAgainst += awayGoals
    away.goalsFor += awayGoals
    away.goalsAgainst += homeGoals

    if (homeGoals > awayGoals) {
      home.won += 1
      away.lost += 1
      home.points += 3
    } else if (homeGoals < awayGoals) {
      away.won += 1
      home.lost += 1
      away.points += 3
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  }

  const rows = Array.from(table.values())
  rows.forEach((r) => {
    r.goalDifference = r.goalsFor - r.goalsAgainst
  })

  return sortRowsByTieBreakers(rows, groupMatches, predictions)
}

export default function GroupPredictions({ matches, predictions, details, onChange, locked, deadline }: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleChange = useCallback(
    (matchUid: string, side: 'home' | 'away', raw: string) => {
      const current = predictions[matchUid] ?? { match_uid: matchUid, home_score: null, away_score: null }
      const val = raw === '' ? null : parseInt(raw, 10)
      const home = side === 'home' ? val : current.home_score
      const away = side === 'away' ? val : current.away_score
      onChange(matchUid, home, away)
    },
    [predictions, onChange],
  )

  // Tab to next input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextKey: string) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      inputRefs.current[nextKey]?.focus()
    }
  }

  const grouped = groupByGroup(matches)

  return (
    <div className="space-y-8">
      {deadline && (
        <div className={`text-sm px-4 py-2 rounded-lg ${locked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          {locked
            ? 'Predictions for the Group Stage are now locked.'
            : `Deadline: ${deadline.toLocaleString()}`}
        </div>
      )}

      {Object.entries(grouped).map(([group, groupMatches]) => (
        <div key={group}>
          <h3 className="text-base font-semibold text-brand-800 mb-3">{group}</h3>
          <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-50 text-brand-600 text-xs uppercase tracking-wide">
                  <th className="py-2 px-3 text-left">Date</th>
                  <th className="py-2 px-3 text-right">Home</th>
                  <th className="py-2 px-3 text-center w-28">Score</th>
                  <th className="py-2 px-3 text-left">Away</th>
                  <th className="py-2 px-3 text-center w-24 hidden md:table-cell">Result</th>
                  <th className="py-2 px-3 text-center w-12 hidden md:table-cell">Pts</th>
                </tr>
              </thead>
              <tbody>
                {groupMatches.map((match, idx) => {
                  const pred = predictions[match.match_uid]
                  const detail = details[match.match_uid]
                  const actual = actualScore(match, detail)
                  const rag: RagStatus = detail?.rag ?? null
                  const homeKey = `${match.match_uid}-home`
                  const awayKey = `${match.match_uid}-away`
                  // Next input key for tab order
                  const nextMatch = groupMatches[idx + 1]
                  const tabNextKey = nextMatch ? `${nextMatch.match_uid}-home` : ''

                  return (
                    <tr
                      key={match.match_uid}
                      className={`border-t border-gray-50 hover:bg-gray-50 transition-colors ${ragClass(rag)}`}
                    >
                      <td className="py-2.5 px-3 text-gray-400 text-xs whitespace-nowrap">
                        {match.start_time ? match.start_time.slice(0, 10) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-brand-800">
                        {match.home_team}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            ref={(el) => { inputRefs.current[homeKey] = el }}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={99}
                            className={`score-input ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            value={pred?.home_score ?? ''}
                            disabled={locked}
                            onChange={(e) => handleChange(match.match_uid, 'home', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, awayKey)}
                            aria-label={`${match.home_team} score`}
                          />
                          <span className="text-gray-400 font-light">–</span>
                          <input
                            ref={(el) => { inputRefs.current[awayKey] = el }}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={99}
                            className={`score-input ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            value={pred?.away_score ?? ''}
                            disabled={locked}
                            onChange={(e) => handleChange(match.match_uid, 'away', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, tabNextKey)}
                            aria-label={`${match.away_team} score`}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-brand-800">{match.away_team}</td>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell">
                        {isMatchCompleted(match, detail) ? (
                          <span className="text-gray-600 font-mono text-xs">
                            {actual.home}–{actual.away}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">–</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center hidden md:table-cell">
                        {isMatchCompleted(match, detail) ? (
                          <span className="font-semibold text-xs">{detail?.points ?? 0}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">–</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="bg-brand-50 text-brand-700 text-xs uppercase tracking-wide px-3 py-2">Table Preview</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                    <th className="py-2 px-3 text-left">Team</th>
                    <th className="py-2 px-2 text-center w-10">P</th>
                    <th className="py-2 px-2 text-center w-10">W</th>
                    <th className="py-2 px-2 text-center w-10">D</th>
                    <th className="py-2 px-2 text-center w-10">L</th>
                    <th className="py-2 px-2 text-center w-12">GF</th>
                    <th className="py-2 px-2 text-center w-12">GA</th>
                    <th className="py-2 px-2 text-center w-12">GD</th>
                    <th className="py-2 px-3 text-center w-14">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {buildGroupTable(groupMatches, predictions).map((row, idx) => (
                    <tr key={row.team} className={`border-t border-gray-50 ${idx < 2 ? 'bg-emerald-50/40' : ''}`}>
                      <td className="py-2 px-3 font-medium text-brand-900 whitespace-nowrap">{row.team}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.played}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.won}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.drawn}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.lost}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.goalsFor}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.goalsAgainst}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{row.goalDifference}</td>
                      <td className="py-2 px-3 text-center font-semibold text-brand-800">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
