import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api'
import type { League, Tournament } from '../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [leagues, setLeagues] = useState<League[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [newLeagueName, setNewLeagueName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [tournamentKey, setTournamentKey] = useState('wc2026')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [l, t] = await Promise.all([api.getMyLeagues(), api.getTournaments()])
      setLeagues(l)
      setTournaments(t)
      if (t.length > 0) setTournamentKey(t[0].key)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newLeagueName.trim()) return
    try {
      await api.createLeague(newLeagueName.trim(), tournamentKey)
      setNewLeagueName('')
      fetchData()
    } catch {
      setError('Failed to create league')
    }
  }

  const handleJoinLeague = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    try {
      await api.joinLeague(joinCode.trim())
      setJoinCode('')
      fetchData()
    } catch {
      setError('Invalid invite code')
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-brand-900">
          Welcome back, {user?.display_name ?? user?.email}
        </h1>
        <p className="text-gray-500 mt-1">World Cup 2026 Prediction League</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/predictions" className="btn-primary">
          My Predictions
        </Link>
        {user?.is_admin ? (
          <Link to="/admin" className="btn-secondary">
            Admin Panel
          </Link>
        ) : null}
      </div>

      {/* Leagues */}
      <div>
        <h2 className="text-lg font-semibold text-brand-800 mb-3">My Leagues</h2>
        {leagues.length === 0 ? (
          <p className="text-gray-400 text-sm">You are not in any league yet. Create or join one below.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <div key={league.id} className="card flex flex-col gap-2">
                <div>
                  <h3 className="font-semibold text-brand-800">{league.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{league.tournament_key}</p>
                </div>
                <div className="flex gap-2 mt-auto pt-2">
                  <Link to={`/leaderboard/${league.id}`} className="btn-primary text-sm py-1.5">
                    Leaderboard
                  </Link>
                  <button
                    onClick={() => navigator.clipboard.writeText(league.invite_code)}
                    className="btn-secondary text-sm py-1.5"
                    title="Copy invite code"
                  >
                    Copy invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Join */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Create */}
        <div className="card">
          <h3 className="font-semibold text-brand-800 mb-3">Create a League</h3>
          <form onSubmit={handleCreateLeague} className="space-y-3">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              placeholder="League name"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              required
            />
            {tournaments.length > 1 && (
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={tournamentKey}
                onChange={(e) => setTournamentKey(e.target.value)}
              >
                {tournaments.map((t) => (
                  <option key={t.key} value={t.key}>{t.name}</option>
                ))}
              </select>
            )}
            <button type="submit" className="btn-primary w-full">Create</button>
          </form>
        </div>

        {/* Join */}
        <div className="card">
          <h3 className="font-semibold text-brand-800 mb-3">Join a League</h3>
          <form onSubmit={handleJoinLeague} className="space-y-3">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full">Join</button>
          </form>
        </div>
      </div>
    </div>
  )
}
