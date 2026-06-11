import { Link } from 'react-router-dom'
import type { LeaderboardRow } from '../types'

interface Props {
  rows: LeaderboardRow[]
  highlightUserId?: number
  leagueId?: number
}

export default function ScoreTable({ rows, highlightUserId, leagueId }: Props) {
  if (rows.length === 0) {
    return <div className="card text-center text-gray-400 py-10">No scores yet.</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-50 text-brand-600 text-xs uppercase tracking-wide">
            <th className="py-3 px-4 text-center w-10">#</th>
            <th className="py-3 px-4 text-left">Player</th>
            <th className="py-3 px-4 text-right">Total</th>
            <th className="py-3 px-4 text-right hidden md:table-cell">Group</th>
            <th className="py-3 px-4 text-right hidden md:table-cell">KO Matches</th>
            <th className="py-3 px-4 text-right hidden md:table-cell">Advance</th>
            <th className="py-3 px-4 text-right hidden md:table-cell">Bonus</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isHighlighted = row.user_id === highlightUserId
            const rankColor =
              row.rank === 1 ? 'text-brand-600 font-bold' :
              row.rank === 2 ? 'text-gray-500 font-semibold' :
              row.rank === 3 ? 'text-amber-700 font-semibold' : 'text-gray-400'

            return (
              <tr
                key={row.user_id}
                className={`border-t border-gray-50 transition-colors ${isHighlighted ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
              >
                <td className={`py-3 px-4 text-center text-base ${rankColor}`}>
                  {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : row.rank}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {row.avatar_url && (
                      <img src={row.avatar_url} alt="" className="h-7 w-7 rounded-full" />
                    )}
                    <div>
                      {leagueId ? (
                        <Link
                          to={`/predictions?${new URLSearchParams({
                            userId: String(row.user_id),
                            name: row.display_name ?? row.email,
                            leagueId: String(leagueId),
                          }).toString()}`}
                          className={`font-medium hover:underline ${isHighlighted ? 'text-brand-900' : 'text-brand-800'}`}
                        >
                          {row.display_name ?? row.email}
                        </Link>
                      ) : (
                        <div className={`font-medium ${isHighlighted ? 'text-brand-900' : 'text-brand-800'}`}>
                          {row.display_name ?? row.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className={`py-3 px-4 text-right font-bold text-lg ${isHighlighted ? 'text-brand-900' : 'text-brand-800'}`}>
                  {row.total_points}
                </td>
                <td className="py-3 px-4 text-right text-gray-500 hidden md:table-cell">{row.group_match_points}</td>
                <td className="py-3 px-4 text-right text-gray-500 hidden md:table-cell">{row.knockout_match_points}</td>
                <td className="py-3 px-4 text-right text-gray-500 hidden md:table-cell">{row.knockout_advance_points}</td>
                <td className="py-3 px-4 text-right text-gray-500 hidden md:table-cell">{row.bonus_points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
