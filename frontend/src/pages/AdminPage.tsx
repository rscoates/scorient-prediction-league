import { useState, useEffect } from 'react'
import * as api from '../api'
import type { User, Tournament, BonusResult, KnockoutResult } from '../types'

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [bonusResult, setBonusResult] = useState<Partial<BonusResult>>({})
  const [_koResult, setKoResult] = useState<Partial<KnockoutResult>>({})
  const [tab, setTab] = useState<'users' | 'deadlines' | 'results' | 'ingest'>('users')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    api.adminGetUsers().then(setUsers)
    api.getTournament('wc2026').then(setTournament)
    api.adminGetBonusResult('wc2026').then(setBonusResult).catch(() => {})
    api.adminGetKnockoutResult('wc2026').then(setKoResult).catch(() => {})
  }, [])

  const notify = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 3000)
  }

  const handlePromote = async (userId: number) => {
    await api.adminPromoteUser(userId)
    api.adminGetUsers().then(setUsers)
    notify('User promoted')
  }

  const handleDemote = async (userId: number) => {
    await api.adminDemoteUser(userId)
    api.adminGetUsers().then(setUsers)
    notify('User demoted')
  }

  const handleSaveBonus = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.adminSetBonusResult('wc2026', bonusResult)
      notify('Bonus results saved')
    } finally { setSaving(false) }
  }

  const handleSaveDeadline = async (roundId: number, value: string) => {
    if (!tournament) return
    await api.setRoundDeadline(tournament.key, roundId, value || null)
    api.getTournament('wc2026').then(setTournament)
    notify('Deadline updated')
  }

  const handleIngest = async () => {
    setSaving(true)
    try {
      const r = await api.adminRunIngest()
      notify(`Ingest complete: ${r.ingested} matches`)
    } catch {
      notify('Ingest failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-900">Admin Panel</h1>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['users', 'deadlines', 'results', 'ingest'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-brand-700 text-brand-800' : 'border-transparent text-gray-500 hover:text-brand-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === 'users' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-4">{u.email}</td>
                  <td className="py-2 pr-4">{u.display_name}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_admin ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_admin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="py-2">
                    {u.is_admin ? (
                      <button onClick={() => handleDemote(u.id)} className="text-xs text-red-600 hover:underline">Demote</button>
                    ) : (
                      <button onClick={() => handlePromote(u.id)} className="text-xs text-brand-600 hover:underline">Promote</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deadlines */}
      {tab === 'deadlines' && tournament && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Set the deadline for each round. After the deadline, predictions are locked and become public.</p>
          {tournament.rounds.map((r) => (
            <div key={r.id} className="flex items-center gap-4 card">
              <span className="font-medium text-brand-800 w-40">{r.display_name}</span>
              <input
                type="datetime-local"
                defaultValue={r.deadline ? r.deadline.slice(0, 16) : ''}
                onBlur={(e) => handleSaveDeadline(r.id, e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {tab === 'results' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveBonus} className="card space-y-4">
            <h3 className="font-semibold text-brand-800">Bonus Results</h3>
            {[
              { key: 'top_scorer', label: 'Top Goalscorer' },
              { key: 'top_assists', label: 'Most Assists' },
              { key: 'final_referee', label: 'Final Referee' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-36">{label}</label>
                <input
                  className="border border-gray-200 rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:border-brand-500"
                  value={(bonusResult as Record<string, string | number | null>)[key] as string ?? ''}
                  onChange={(e) => setBonusResult((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            {[
              { key: 'total_goals', label: 'Total Goals' },
              { key: 'total_red_cards', label: 'Total Red Cards' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm text-gray-600 w-36">{label}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="border border-gray-200 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:border-brand-500"
                  value={(bonusResult as Record<string, string | number | null>)[key] as number ?? ''}
                  onChange={(e) => setBonusResult((prev) => ({ ...prev, [key]: e.target.value ? parseInt(e.target.value) : null }))}
                />
              </div>
            ))}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Bonus Results'}
            </button>
          </form>
        </div>
      )}

      {/* Ingest */}
      {tab === 'ingest' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-brand-800">Data Ingest</h3>
          <p className="text-sm text-gray-500">
            Manually trigger a data ingest from the worldcup2026.json file. This will update match
            scores and recalculate all points.
          </p>
          <button onClick={handleIngest} className="btn-primary" disabled={saving}>
            {saving ? 'Running…' : 'Run Ingest Now'}
          </button>
        </div>
      )}
    </div>
  )
}
