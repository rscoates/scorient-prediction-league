import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'
import type { Match, MatchPrediction, Tournament } from '../types'
import GroupPredictions from '../components/GroupPredictions'
import KnockoutRoundPredictions from '../components/KnockoutRoundPredictions'
import InitialKnockoutPrediction from '../components/InitialKnockoutPrediction'
import BonusPredictions from '../components/BonusPredictions'

type Tab = 'group' | 'knockout' | 'initial-ko' | 'bonus'

const TABS: { id: Tab; label: string }[] = [
  { id: 'group', label: 'Group Stage' },
  { id: 'knockout', label: 'Knockout Rounds' },
  { id: 'initial-ko', label: 'Pre-Tournament Bracket' },
  { id: 'bonus', label: 'Bonus Predictions' },
]

export default function PredictionsPage() {
  const [tab, setTab] = useState<Tab>('group')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, MatchPrediction>>({})
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const t = await api.getTournament('wc2026')
      const [matchList, predList] = await Promise.all([
        api.getMatches({ tournament_id: t.id }),
        api.getMyMatchPredictions(),
      ])
      setTournament(t)
      setMatches(matchList)
      const predMap: Record<string, MatchPrediction> = {}
      predList.forEach((p) => { predMap[p.match_uid] = p })
      setPredictions(predMap)
      setSaveError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const handlePredictionChange = useCallback(
    async (matchUid: string, home: number | null, away: number | null) => {
      setSaveError(null)
      setPredictions((prev) => ({ ...prev, [matchUid]: { match_uid: matchUid, home_score: home, away_score: away } }))
      try {
        await api.saveMatchPrediction(matchUid, home, away)
      } catch (err: any) {
        const detail = err?.response?.data?.detail
        setSaveError(typeof detail === 'string' ? detail : 'Could not save prediction')
        // revert on error
        loadAll()
      }
    },
    [loadAll],
  )

  const groupMatches = matches.filter((m) => m.stage === 'Group')
  const knockoutMatches = matches.filter((m) => m.stage && m.stage !== 'Group')

  const deadlineFor = (stage: string) => {
    const round = tournament?.rounds.find((r) => r.stage === stage)
    return round?.deadline ? new Date(round.deadline) : null
  }

  const isLocked = (stage: string) => {
    const dl = deadlineFor(stage)
    return dl ? new Date() > dl : false
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading predictions…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">My Predictions</h1>
        <p className="text-gray-500 mt-1 text-sm">Changes are saved automatically as you type.</p>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {saveError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === id
                ? 'border-brand-700 text-brand-800'
                : 'border-transparent text-gray-500 hover:text-brand-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'group' && (
        <GroupPredictions
          matches={groupMatches}
          predictions={predictions}
          onChange={handlePredictionChange}
          locked={isLocked('Group')}
          deadline={deadlineFor('Group')}
        />
      )}

      {tab === 'knockout' && (
        <KnockoutRoundPredictions
          matches={knockoutMatches}
          predictions={predictions}
          onChange={handlePredictionChange}
          tournament={tournament}
          isLocked={isLocked}
        />
      )}

      {tab === 'initial-ko' && (
        <InitialKnockoutPrediction
          tournamentKey="wc2026"
          allTeams={[...new Set(
            groupMatches.flatMap((m) => [m.home_team, m.away_team]).filter(Boolean) as string[]
          )].sort()}
          locked={isLocked('Group')}
          deadline={deadlineFor('Group')}
          groupMatches={groupMatches}
          groupPredictions={predictions}
        />
      )}

      {tab === 'bonus' && (
        <BonusPredictions
          tournamentKey="wc2026"
          locked={isLocked('Group')}
          deadline={deadlineFor('Group')}
        />
      )}
    </div>
  )
}
