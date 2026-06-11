import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import * as api from '../api'
import type { LeaderboardRow, League } from '../types'
import ScoreTable from '../components/ScoreTable'
import { useAuth } from '../contexts/AuthContext'

export default function LeaderboardPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const { user } = useAuth()
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [league, setLeague] = useState<League | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leagueId) return
    const id = parseInt(leagueId, 10)
    Promise.all([api.getLeague(id), api.getLeaderboard(id)])
      .then(([lg, lb]) => {
        setLeague(lg)
        setRows(lb)
      })
      .finally(() => setLoading(false))

    // Poll every 30 s
    const interval = setInterval(() => {
      api.getLeaderboard(id).then(setRows)
    }, 30_000)
    return () => clearInterval(interval)
  }, [leagueId])

  if (loading) return <div className="text-center py-12 text-gray-400">Loading leaderboard…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-brand-600 hover:text-brand-800 text-sm">← Back</Link>
        <div>
          <h1 className="text-2xl font-semibold text-brand-900">{league?.name ?? 'League'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live leaderboard · updates every 30 s</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => leagueId && api.exportCsv(parseInt(leagueId, 10))}
            className="btn-secondary text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => leagueId && api.exportJson(parseInt(leagueId, 10))}
            className="btn-secondary text-sm"
          >
            Export JSON
          </button>
        </div>
      </div>

      <ScoreTable rows={rows} highlightUserId={user?.id} leagueId={league ? parseInt(leagueId ?? '0', 10) : undefined} />
    </div>
  )
}
