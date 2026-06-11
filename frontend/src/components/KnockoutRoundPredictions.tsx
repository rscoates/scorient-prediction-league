import type { Match, MatchDetail, MatchPrediction, RagStatus, Tournament } from '../types'

const STAGE_ORDER = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', 'Final']

// Placeholder team names like "1A", "2B", "W35" mean the match isn't confirmed yet
const isPlaceholder = (name: string | null | undefined) =>
  !name || /^[0-9]/.test(name) || /^[A-Z]{1,2}\d+$/.test(name)

interface Props {
  matches: Match[]
  predictions: Record<string, MatchPrediction>
  details: Record<string, MatchDetail>
  onChange: (matchUid: string, home: number | null, away: number | null) => void
  tournament: Tournament | null
  isLocked: (stage: string) => boolean
}

function ragClass(rag: RagStatus): string {
  if (rag === 'green') return 'rag-green'
  if (rag === 'amber') return 'rag-amber'
  if (rag === 'red') return 'rag-red'
  return 'bg-gray-100 text-gray-500'
}

export default function KnockoutRoundPredictions({ matches, predictions, details, onChange, tournament, isLocked }: Props) {
  const byStage: Record<string, Match[]> = {}
  for (const m of matches) {
    const s = m.stage ?? 'Other'
    if (!byStage[s]) byStage[s] = []
    byStage[s].push(m)
  }

  const stages = STAGE_ORDER.filter((s) => byStage[s]?.length)

  const deadline = (stage: string) => {
    const r = tournament?.rounds.find((r) => r.stage === stage)
    return r?.deadline ? new Date(r.deadline) : null
  }

  if (stages.length === 0) {
    return (
      <div className="card text-center text-gray-400 py-10">
        Knockout stage matches will appear here once the group stage is complete.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {stages.map((stage) => {
        const stageMatches = byStage[stage]
        const deadlineLocked = isLocked(stage)
        const dl = deadline(stage)

        return (
          <div key={stage}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-brand-800">{stage}</h3>
              {dl && (
                <span className={`text-xs px-2 py-1 rounded-full ${deadlineLocked ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {deadlineLocked ? 'Locked' : `Deadline: ${dl.toLocaleString()}`}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {stageMatches.map((match) => {
                const pred = predictions[match.match_uid]
                const detail = details[match.match_uid]
                const teamsUnknown = isPlaceholder(match.home_team) || isPlaceholder(match.away_team)
                const locked = deadlineLocked || teamsUnknown
                return (
                  <div key={match.match_uid} className={`card flex items-center gap-3 ${teamsUnknown ? 'opacity-50' : ''}`}>
                    <span className="font-medium text-brand-800 text-sm flex-1 text-right">{match.home_team ?? '?'}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={99}
                        className={`score-input ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={pred?.home_score ?? ''}
                        disabled={locked}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
                          onChange(match.match_uid, v, pred?.away_score ?? null)
                        }}
                      />
                      <span className="text-gray-400 font-light">–</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={99}
                        className={`score-input ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        value={pred?.away_score ?? ''}
                        disabled={locked}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
                          onChange(match.match_uid, pred?.home_score ?? null, v)
                        }}
                      />
                    </div>
                    <span className="font-medium text-brand-800 text-sm flex-1">{match.away_team ?? '?'}</span>
                    {match.effective_home_score !== null && match.effective_away_score !== null && (
                      <span className="text-xs text-gray-400 font-mono ml-2">
                        ({match.effective_home_score}–{match.effective_away_score})
                      </span>
                    )}
                    {detail && detail.actual_home !== null && detail.actual_away !== null && (
                      <span className={`text-xs font-semibold rounded-full px-2 py-1 ml-2 ${ragClass(detail.rag)}`}>
                        {detail.points} pts
                      </span>
                    )}
                    {teamsUnknown && (
                      <span className="text-xs text-gray-400 italic ml-1">TBD</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
