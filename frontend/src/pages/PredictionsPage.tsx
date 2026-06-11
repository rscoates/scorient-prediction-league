import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as api from '../api'
import type { Match, MatchDetail, MatchPrediction, ScoreSummary, Tournament } from '../types'
import GroupPredictions from '../components/GroupPredictions'
import KnockoutRoundPredictions from '../components/KnockoutRoundPredictions'
import InitialKnockoutPrediction from '../components/InitialKnockoutPrediction'
import BonusPredictions from '../components/BonusPredictions'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'group' | 'knockout' | 'initial-ko' | 'bonus'

const TABS: { id: Tab; label: string }[] = [
  { id: 'group', label: 'Group Stage' },
  { id: 'knockout', label: 'Knockout Rounds' },
  { id: 'initial-ko', label: 'Pre-Tournament Bracket' },
  { id: 'bonus', label: 'Bonus Predictions' },
]

function matchPredictionPoints(
  predHome: number | null,
  predAway: number | null,
  actualHome: number | null,
  actualAway: number | null,
): { points: number; rag: MatchDetail['rag'] } {
  if (actualHome === null || actualAway === null) return { points: 0, rag: null }
  if (predHome === null || predAway === null) return { points: 0, rag: 'red' }
  if (predHome === actualHome && predAway === actualAway) return { points: 5, rag: 'green' }
  const predSign = Math.sign(predHome - predAway)
  const actualSign = Math.sign(actualHome - actualAway)
  if (predSign === actualSign) return { points: 3, rag: 'amber' }
  return { points: 0, rag: 'red' }
}

function buildMatchDetailMap(matches: Match[], predictions: Record<string, MatchPrediction>): Record<string, MatchDetail> {
  const map: Record<string, MatchDetail> = {}
  for (const match of matches) {
    const pred = predictions[match.match_uid]
    if (!pred) continue
    const actualHome = match.effective_home_score
    const actualAway = match.effective_away_score
    const { points, rag } = matchPredictionPoints(pred.home_score, pred.away_score, actualHome, actualAway)
    map[match.match_uid] = {
      match_uid: match.match_uid,
      home_score: pred.home_score,
      away_score: pred.away_score,
      pred_home: pred.home_score,
      pred_away: pred.away_score,
      stage: match.stage,
      home_team: match.home_team,
      away_team: match.away_team,
      actual_home: actualHome,
      actual_away: actualAway,
      points,
      rag,
    }
  }
  return map
}

function toPredictionMap(predictions: MatchPrediction[]): Record<string, MatchPrediction> {
  const predMap: Record<string, MatchPrediction> = {}
  predictions.forEach((prediction) => {
    predMap[prediction.match_uid] = prediction
  })
  return predMap
}

export default function PredictionsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('group')
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, MatchPrediction>>({})
  const [viewedPredictions, setViewedPredictions] = useState<Record<string, MatchPrediction>>({})
  const [scoreSummary, setScoreSummary] = useState<ScoreSummary | null>(null)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)

  const viewedUserIdRaw = searchParams.get('userId')
  const viewedUserId = viewedUserIdRaw ? parseInt(viewedUserIdRaw, 10) : null
  const viewedUserName = searchParams.get('name')
  const sourceLeagueId = searchParams.get('leagueId')
  const isCompareView = Boolean(user && viewedUserId && viewedUserId !== user.id)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const t = await api.getTournament('wc2026')
      const [matchList, predList, score, otherPredList] = await Promise.all([
        api.getMatches({ tournament_id: t.id }),
        api.getMyMatchPredictions(),
        api.getMyScore('wc2026'),
        isCompareView && viewedUserId ? api.getUserMatchPredictions(viewedUserId, t.id) : Promise.resolve([]),
      ])
      setTournament(t)
      setMatches(matchList)
      setPredictions(toPredictionMap(predList))
      setViewedPredictions(toPredictionMap(otherPredList))
      setScoreSummary(score)
      setSaveError(null)
    } finally {
      setLoading(false)
    }
  }, [isCompareView, viewedUserId])

  useEffect(() => { loadAll() }, [loadAll])

  const handlePredictionChange = useCallback(
    async (matchUid: string, home: number | null, away: number | null) => {
      if (isCompareView) return
      setSaveError(null)
      setPredictions((prev) => ({ ...prev, [matchUid]: { match_uid: matchUid, home_score: home, away_score: away } }))
      try {
        await api.saveMatchPrediction(matchUid, home, away)
        const score = await api.getMyScore('wc2026')
        setScoreSummary(score)
      } catch (err: any) {
        const detail = err?.response?.data?.detail
        setSaveError(typeof detail === 'string' ? detail : 'Could not save prediction')
        // revert on error
        loadAll()
      }
    },
    [isCompareView, loadAll],
  )

  const groupMatches = matches.filter((m) => m.stage === 'Group')
  const knockoutMatches = matches.filter((m) => m.stage && m.stage !== 'Group')
  const ownScoreDetails = (scoreSummary?.match_details ?? []).reduce<Record<string, MatchDetail>>((acc, detail) => {
    acc[detail.match_uid] = detail
    return acc
  }, {})
  const activePredictions = isCompareView ? viewedPredictions : predictions
  const scoreDetails = isCompareView ? buildMatchDetailMap(matches, viewedPredictions) : ownScoreDetails

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
        {isCompareView && sourceLeagueId && (
          <Link to={`/leaderboard/${sourceLeagueId}`} className="text-brand-600 hover:text-brand-800 text-sm">← Back to leaderboard</Link>
        )}
        <h1 className="text-2xl font-semibold text-brand-900 mt-1">
          {isCompareView ? `${viewedUserName ?? 'Player'}'s Predictions` : 'My Predictions'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {isCompareView
            ? 'Your predictions are shown alongside theirs. Only public rounds are visible for other players.'
            : 'Changes are saved automatically as you type.'}
        </p>
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
          predictions={activePredictions}
          details={scoreDetails}
          comparisonPredictions={isCompareView ? predictions : undefined}
          comparisonLabel="You"
          onChange={handlePredictionChange}
          locked={isLocked('Group')}
          deadline={deadlineFor('Group')}
          readOnly={isCompareView}
        />
      )}

      {tab === 'knockout' && (
        <KnockoutRoundPredictions
          matches={knockoutMatches}
          predictions={activePredictions}
          details={scoreDetails}
          comparisonPredictions={isCompareView ? predictions : undefined}
          comparisonLabel="You"
          onChange={handlePredictionChange}
          tournament={tournament}
          isLocked={isLocked}
          readOnly={isCompareView}
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
          targetUserId={isCompareView && viewedUserId ? viewedUserId : undefined}
          comparisonLabel="You"
          readOnly={isCompareView}
        />
      )}

      {tab === 'bonus' && (
        <BonusPredictions
          tournamentKey="wc2026"
          locked={isLocked('Group')}
          deadline={deadlineFor('Group')}
          targetUserId={isCompareView && viewedUserId ? viewedUserId : undefined}
          comparisonLabel="You"
          readOnly={isCompareView}
        />
      )}
    </div>
  )
}
