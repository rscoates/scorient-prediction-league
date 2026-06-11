import { useState, useEffect } from 'react'
import * as api from '../api'
import type { BonusPrediction } from '../types'

interface Props {
  tournamentKey: string
  locked: boolean
  deadline: Date | null
  targetUserId?: number
  comparisonLabel?: string
  readOnly?: boolean
}

const FIELDS: { key: keyof BonusPrediction; label: string; desc: string; type: 'text' | 'number'; points: string }[] = [
  { key: 'top_scorer', label: 'Top Goalscorer', desc: 'Player with the most goals', type: 'text', points: '15 pts' },
  { key: 'top_assists', label: 'Most Assists', desc: 'Player with the most assists', type: 'text', points: '15 pts' },
  { key: 'total_goals', label: 'Total Goals', desc: 'Exact: 20 pts · within ±5: 10 pts', type: 'number', points: '20 / 10 pts' },
  { key: 'total_red_cards', label: 'Total Red Cards', desc: 'Exact: 10 pts · within ±1: 5 pts', type: 'number', points: '10 / 5 pts' },
  { key: 'final_referee', label: 'Final Referee', desc: 'The referee who officiates the final', type: 'text', points: '5 pts' },
]

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export default function BonusPredictions({ tournamentKey, locked, deadline, targetUserId, comparisonLabel = 'You', readOnly = false }: Props) {
  const [pred, setPred] = useState<Partial<BonusPrediction>>({})
  const [comparisonPred, setComparisonPred] = useState<Partial<BonusPrediction>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.getBonusPrediction(tournamentKey, targetUserId),
      targetUserId ? api.getBonusPrediction(tournamentKey) : Promise.resolve(null),
    ])
      .then(([mainPred, ownPred]) => {
        if (mainPred) setPred(mainPred)
        if (ownPred) setComparisonPred(ownPred)
      })
      .catch(() => {
        setPred({})
        setComparisonPred({})
      })
      .finally(() => setLoading(false))
  }, [tournamentKey, targetUserId])

  const handleChange = async (key: keyof BonusPrediction, value: string) => {
    if (locked || readOnly) return
    const coerced = value === '' ? null : (FIELDS.find((f) => f.key === key)?.type === 'number' ? parseInt(value, 10) : value)
    const newPred = { ...pred, [key]: coerced }
    setPred(newPred)
    setSaving(true)
    try {
      await api.saveBonusPrediction(tournamentKey, { [key]: coerced })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-brand-800">Bonus Predictions</h2>
        <p className="text-sm text-gray-500 mt-1">These predictions are locked at the same time as the Group Stage deadline.</p>
        {deadline && (
          <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${locked ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
            {locked ? 'Locked.' : `Deadline: ${deadline.toLocaleString()}`}
          </div>
        )}
        {saving && <span className="text-xs text-gray-400 mt-1 inline-block">Saving…</span>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(({ key, label, desc, type, points }) => (
          <div key={key} className="card">
            <div className="flex items-baseline justify-between mb-1">
              <label className="font-medium text-brand-800 text-sm" htmlFor={key}>{label}</label>
              <span className="text-xs text-brand-600 font-medium">{points}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">{desc}</p>
            <input
              id={key}
              type={type}
              inputMode={type === 'number' ? 'numeric' : 'text'}
              className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500 ${locked ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''}`}
              value={(pred[key] as string | number | null | undefined) ?? ''}
              disabled={locked || readOnly}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={type === 'number' ? '0' : 'Enter name'}
            />
            {targetUserId && (
              <p className="mt-2 text-xs text-gray-500">
                <span className="font-medium text-gray-600">{comparisonLabel}:</span> {formatValue(comparisonPred[key] as string | number | null | undefined)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
