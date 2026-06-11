import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import GroupPredictions from '../src/components/GroupPredictions'
import KnockoutRoundPredictions from '../src/components/KnockoutRoundPredictions'
import ScoreTable from '../src/components/ScoreTable'
import type { Match, LeaderboardRow, MatchDetail, Tournament } from '../src/types'

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

const tournament: Tournament = {
  id: 1,
  key: 'wc2026',
  name: 'World Cup 2026',
  is_active: 1,
  rounds: [],
}

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
        details={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )
    expect(screen.getAllByText('France').length).toBeGreaterThan(0)
    expect(screen.getAllByText('England').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Brazil').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Germany').length).toBeGreaterThan(0)
  })

  test('score inputs are disabled when locked', () => {
    render(
      <GroupPredictions
        matches={matches}
        predictions={{}}
        details={{}}
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
        details={{}}
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
        details={{}}
        onChange={onChange}
        locked={true}
        deadline={new Date('2026-06-01')}
      />,
    )
    expect(screen.getByText(/locked/i)).toBeInTheDocument()
  })

  test('shows points for a completed group match', () => {
    const detail: MatchDetail = {
      match_uid: 'm1',
      home_score: 2,
      away_score: 1,
      pred_home: 2,
      pred_away: 1,
      stage: 'Group',
      home_team: 'France',
      away_team: 'England',
      actual_home: 2,
      actual_away: 1,
      points: 5,
      rag: 'green',
    }

    render(
      <GroupPredictions
        matches={[makeMatch('m1', 'France', 'England')]}
        predictions={{ m1: { match_uid: 'm1', home_score: 2, away_score: 1 } }}
        details={{ m1: detail }}
        comparisonPredictions={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  test('shows zero points for a completed group match without score details', () => {
    render(
      <GroupPredictions
        matches={[{ ...makeMatch('m1', 'France', 'England'), effective_home_score: 2, effective_away_score: 1 }]}
        predictions={{}}
        details={{}}
        comparisonPredictions={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )

    expect(screen.getByLabelText('France score').closest('tr')).toHaveTextContent('0')
  })

  test('keeps group matches in chronological order', () => {
    render(
      <GroupPredictions
        matches={[
          { ...makeMatch('late', 'Brazil', 'Germany'), start_time: '2026-06-12T20:00:00Z' },
          { ...makeMatch('early', 'France', 'England'), start_time: '2026-06-11T17:00:00Z', effective_home_score: 2, effective_away_score: 1 },
        ]}
        predictions={{}}
        details={{}}
        comparisonPredictions={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )

    const franceRow = screen.getByLabelText('France score').closest('tr')
    const brazilRow = screen.getByLabelText('Brazil score').closest('tr')
    expect(franceRow?.compareDocumentPosition(brazilRow as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('orders group sections by earliest kickoff time', () => {
    render(
      <GroupPredictions
        matches={[
          { ...makeMatch('a1', 'Mexico', 'South Africa'), group: 'Group A', start_time: '2026-06-13T20:00:00Z' },
          { ...makeMatch('b1', 'Canada', 'Bosnia & Herzegovina'), group: 'Group B', start_time: '2026-06-12T15:00:00Z' },
        ]}
        predictions={{}}
        details={{}}
        comparisonPredictions={{}}
        onChange={onChange}
        locked={false}
        deadline={null}
      />,
    )

    const groupAHeading = screen.getByText('Group A')
    const groupBHeading = screen.getByText('Group B')
    expect(groupBHeading.compareDocumentPosition(groupAHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('shows your prediction alongside the viewed user', () => {
    render(
      <GroupPredictions
        matches={[makeMatch('m1', 'France', 'England')]}
        predictions={{ m1: { match_uid: 'm1', home_score: 1, away_score: 0 } }}
        details={{}}
        comparisonPredictions={{ m1: { match_uid: 'm1', home_score: 2, away_score: 1 } }}
        comparisonLabel="You"
        onChange={onChange}
        locked={true}
        deadline={null}
        readOnly={true}
      />,
    )

    expect(screen.getByText(/You:/)).toBeInTheDocument()
    expect(screen.getByText(/2–1/)).toBeInTheDocument()
  })
})

describe('KnockoutRoundPredictions', () => {
  test('shows points for a completed knockout match', () => {
    const match = {
      ...makeMatch('k1', 'France', 'England'),
      stage: 'Round of 16',
      effective_home_score: 1,
      effective_away_score: 0,
    }
    const detail: MatchDetail = {
      match_uid: 'k1',
      home_score: 1,
      away_score: 0,
      pred_home: 1,
      pred_away: 0,
      stage: 'Round of 16',
      home_team: 'France',
      away_team: 'England',
      actual_home: 1,
      actual_away: 0,
      points: 5,
      rag: 'green',
    }

    render(
      <KnockoutRoundPredictions
        matches={[match]}
        predictions={{ k1: { match_uid: 'k1', home_score: 1, away_score: 0 } }}
        details={{ k1: detail }}
        comparisonPredictions={{}}
        onChange={jest.fn()}
        tournament={tournament}
        isLocked={() => false}
      />,
    )

    expect(screen.getByText('5 pts')).toBeInTheDocument()
  })

  test('shows zero points for a completed knockout match without score details', () => {
    const match = {
      ...makeMatch('k1', 'France', 'England'),
      stage: 'Round of 16',
      effective_home_score: 1,
      effective_away_score: 0,
    }

    render(
      <KnockoutRoundPredictions
        matches={[match]}
        predictions={{}}
        details={{}}
        comparisonPredictions={{}}
        onChange={jest.fn()}
        tournament={tournament}
        isLocked={() => false}
      />,
    )

    expect(screen.getByText('0 pts')).toBeInTheDocument()
  })

  test('keeps knockout matches in chronological order', () => {
    render(
      <KnockoutRoundPredictions
        matches={[
          { ...makeMatch('late', 'Brazil', 'Germany'), stage: 'Round of 16', start_time: '2026-06-15T20:00:00Z' },
          { ...makeMatch('early', 'France', 'England'), stage: 'Round of 16', start_time: '2026-06-14T17:00:00Z', effective_home_score: 1, effective_away_score: 0 },
        ]}
        predictions={{}}
        details={{}}
        comparisonPredictions={{}}
        onChange={jest.fn()}
        tournament={tournament}
        isLocked={() => false}
      />,
    )

    const franceScore = screen.getByText('France')
    const brazilScore = screen.getByText('Brazil')
    expect(franceScore.compareDocumentPosition(brazilScore) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  test('shows your knockout prediction alongside the viewed user', () => {
    const match = {
      ...makeMatch('k1', 'France', 'England'),
      stage: 'Round of 16',
    }

    render(
      <KnockoutRoundPredictions
        matches={[match]}
        predictions={{ k1: { match_uid: 'k1', home_score: 1, away_score: 0 } }}
        details={{}}
        comparisonPredictions={{ k1: { match_uid: 'k1', home_score: 2, away_score: 1 } }}
        comparisonLabel="You"
        onChange={jest.fn()}
        tournament={tournament}
        isLocked={() => false}
        readOnly={true}
      />,
    )

    expect(screen.getByText(/You:/)).toBeInTheDocument()
    expect(screen.getByText(/2–1/)).toBeInTheDocument()
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

  test('links player names to compare view when league id is provided', () => {
    render(
      <MemoryRouter>
        <ScoreTable rows={rows} leagueId={7} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute('href', expect.stringContaining('/predictions?'))
    expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute('href', expect.stringContaining('userId=1'))
  })
})
