import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import GroupPredictions from '../src/components/GroupPredictions'
import ScoreTable from '../src/components/ScoreTable'
import type { Match, LeaderboardRow } from '../src/types'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('../src/api', () => ({
  saveMatchPrediction: jest.fn().mockResolvedValue({}),
}))

const makeMatch = (uid: string, home: string, away: string): Match => ({
  match_uid: uid,
  stage: 'Group',
  home_team: home,
  away_team: away,
  start_time: '2026-06-11',
  group: 'Group A',
  tournament_id: 1,
  home_score: null,
  away_score: null,
  admin_home_score: null,
  admin_away_score: null,
  effective_home_score: null,
  effective_away_score: null,
})

// ── GroupPredictions ───────────────────────────────────────────────────────────

describe('GroupPredictions', () => {
  const matches = [
    makeMatch('m1', 'France', 'England'),
    makeMatch('m2', 'Brazil', 'Germany'),
  ]
  const onChange = jest.fn()

  test('renders team names', () => {
    render(
      <GroupPredictions
        matches={matches}
        predictions={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByText('England')).toBeInTheDocument()
    expect(screen.getByText('Brazil')).toBeInTheDocument()
    expect(screen.getByText('Germany')).toBeInTheDocument()
  })

  test('score inputs are disabled when locked', () => {
    render(
      <GroupPredictions
        matches={matches}
        predictions={{}}
        onChange={onChange}
        locked={true}
        deadline={new Date()}
      />,
    )
    const inputs = screen.getAllByRole('spinbutton')
    inputs.forEach((input) => expect(input).toBeDisabled())
  })

  test('calls onChange when score changes', () => {
    render(
      <GroupPredictions
        matches={[makeMatch('m1', 'France', 'England')]}
        predictions={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )
    const homeInput = screen.getByLabelText('France score')
    fireEvent.change(homeInput, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledWith('m1', 2, null)
  })

  test('shows locked message when deadline passed', () => {
    render(
      <GroupPredictions
        matches={[]}
        predictions={{}}
        onChange={onChange}
        locked={true}
        deadline={new Date('2026-06-01')}
      />,
    )
    expect(screen.getByText(/locked/i)).toBeInTheDocument()
  })
})

// ── ScoreTable ─────────────────────────────────────────────────────────────────

describe('ScoreTable', () => {
  const rows: LeaderboardRow[] = [
    {
      rank: 1, user_id: 1, display_name: 'Alice', email: 'alice@test.com', avatar_url: null,
      total_points: 100, group_match_points: 60, knockout_match_points: 20,
      knockout_advance_points: 15, bonus_points: 5,
    },
    {
      rank: 2, user_id: 2, display_name: 'Bob', email: 'bob@test.com', avatar_url: null,
      total_points: 80, group_match_points: 50, knockout_match_points: 15,
      knockout_advance_points: 10, bonus_points: 5,
    },
  ]

  test('renders player names', () => {
    render(<ScoreTable rows={rows} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('renders total points', () => {
    render(<ScoreTable rows={rows} />)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })

  test('shows empty state when no rows', () => {
    render(<ScoreTable rows={[]} />)
    expect(screen.getByText(/no scores yet/i)).toBeInTheDocument()
  })
})
