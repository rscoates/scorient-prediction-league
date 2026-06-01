import { useState, useEffect, useMemo } from 'react'
import * as api from '../api'
import type { Match, MatchPrediction, KnockoutPrediction } from '../types'
import { groupByGroup, buildGroupTable } from './GroupPredictions'

interface Props {
  tournamentKey: string
  allTeams: string[]
  locked: boolean
  deadline: Date | null
  groupMatches: Match[]
  groupPredictions: Record<string, MatchPrediction>
}

interface RoundConfig {
  key: keyof KnockoutPrediction
  label: string
  count: number
  points: string
}

const ROUNDS: RoundConfig[] = [
  { key: 'r32_teams', label: 'Round of 32 (32 teams qualify from groups)', count: 32, points: '5 pts each' },
  { key: 'r16_teams', label: 'Round of 16 (16 teams advance)', count: 16, points: '5 pts each' },
  { key: 'qf_teams', label: 'Quarter-Finals (8 teams)', count: 8, points: '10 pts each' },
  { key: 'sf_teams', label: 'Semi-Finals (4 teams)', count: 4, points: '15 pts each' },
  { key: 'final_teams', label: 'The Final (2 teams)', count: 2, points: '20 pts each' },
]

export default function InitialKnockoutPrediction({ tournamentKey, allTeams, locked, deadline, groupMatches, groupPredictions }: Props) {
  const [pred, setPred] = useState<KnockoutPrediction>({
    r32_teams: [], r16_teams: [], qf_teams: [], sf_teams: [], final_teams: [], winner: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Check all group matches have both scores predicted
  const allGroupPredsFilled = useMemo(() => {
    if (groupMatches.length === 0) return false
    return groupMatches.every((m) => {
      const p = groupPredictions[m.match_uid]
      return p?.home_score !== null && p?.home_score !== undefined &&
             p?.away_score !== null && p?.away_score !== undefined
    })
  }, [groupMatches, groupPredictions])

  const computeR32Teams = (): string[] => {
    const grouped = groupByGroup(groupMatches)
    const top2: string[] = []
    const thirdPlace: { team: string; points: number; gd: number; gf: number }[] = []

    for (const [, matches] of Object.entries(grouped)) {
      const table = buildGroupTable(matches, groupPredictions)
      if (table.length >= 1) top2.push(table[0].team)
      if (table.length >= 2) top2.push(table[1].team)
      if (table.length >= 3) {
        const t = table[2]
        thirdPlace.push({ team: t.team, points: t.points, gd: t.goalDifference, gf: t.goalsFor })
      }
    }

    thirdPlace.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf
      return a.team.localeCompare(b.team)
    })

    return [...top2, ...thirdPlace.slice(0, 8).map((t) => t.team)].sort()
  }

  const handleAutoFillR32 = async () => {
    if (!allGroupPredsFilled || locked) return
    const r32 = computeR32Teams()
    const newPred = { ...pred, r32_teams: r32 }
    setPred(newPred)
    setSaving(true)
    try {
      await api.saveKnockoutPrediction(tournamentKey, { r32_teams: r32 })
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    api.getKnockoutPrediction(tournamentKey)
      .then((p) => { if (p && Object.keys(p).length > 0) setPred(p as KnockoutPrediction) })
      .finally(() => setLoading(false))
  }, [tournamentKey])

  const toggleTeam = async (roundKey: keyof KnockoutPrediction, team: string) => {
    if (locked) return
    const current = (pred[roundKey] ?? []) as string[]
    const updated = current.includes(team)
      ? current.filter((t) => t !== team)
      : [...current, team]
    const newPred = { ...pred, [roundKey]: updated }
    setPred(newPred)
    setSaving(true)
    try {
      await api.saveKnockoutPrediction(tournamentKey, { [roundKey]: updated })
    } finally { setSaving(false) }
  }

  const setWinner = async (team: string) => {
    if (locked) return
    const newPred = { ...pred, winner: team }
    setPred(newPred)
    setSaving(true)
    try {
      await api.saveKnockoutPrediction(tournamentKey, { winner: team })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-brand-800">Pre-Tournament Knockout Predictions</h2>
        <p className="text-sm text-gray-500 mt-1">
          Select which teams you think will advance to each round. Your selections don't need to be consistent with each other.
        </p>
        {deadline && (
          <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${locked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
            {locked ? 'Locked — group stage deadline has passed.' : `Deadline: ${deadline.toLocaleString()}`}
          </div>
        )}
        {saving && <span className="text-xs text-gray-400 mt-1 inline-block">Saving…</span>}
      </div>

      {ROUNDS.map(({ key, label, count, points }) => {
        const selected = (pred[key] ?? []) as string[]
        const isR32 = key === 'r32_teams'
        return (
          <div key={key} className="card">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-medium text-brand-800 text-sm">{label}</h3>
              <div className="flex items-center gap-3">
                {isR32 && !locked && (
                  <div className="flex items-center gap-2">
                    {!allGroupPredsFilled && (
                      <span className="text-xs text-amber-600">Fill in all group predictions first</span>
                    )}
                    <button
                      onClick={handleAutoFillR32}
                      disabled={!allGroupPredsFilled}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        allGroupPredsFilled
                          ? 'bg-brand-700 text-white hover:bg-brand-800'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Auto-fill from group predictions
                    </button>
                  </div>
                )}
                <span className="text-xs text-brand-600 font-medium">{points}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Selected: {selected.length} / {count}
              {selected.length > count && (
                <span className="text-red-500 ml-2">Too many selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTeams.map((team) => {
                const isSelected = selected.includes(team)
                return (
                  <button
                    key={team}
                    onClick={() => toggleTeam(key, team)}
                    disabled={locked}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-800'
                    } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {team}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Winner */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-medium text-brand-800 text-sm">Tournament Winner</h3>
          <span className="text-xs text-brand-600 font-medium">25 pts</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {allTeams.map((team) => (
            <button
              key={team}
              onClick={() => setWinner(team)}
              disabled={locked}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                pred.winner === team
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-800'
              } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {team}
            </button>
          ))}
        </div>
        {pred.winner && (
          <p className="mt-3 text-sm text-brand-700 font-medium">Winner: {pred.winner}</p>
        )}
      </div>
    </div>
  )
}
