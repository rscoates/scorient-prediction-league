// ── API types ──────────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  display_name: string | null
  avatar_url: string | null
  is_admin: number
}

export interface Tournament {
  id: number
  key: string
  name: string
  is_active: number
  rounds: Round[]
}

export interface Round {
  id: number
  stage: string
  display_name: string
  deadline: string | null
  display_order: number
}

export interface Match {
  match_uid: string
  stage: string | null
  home_team: string | null
  away_team: string | null
  start_time: string | null
  group: string | null
  tournament_id: number | null
  home_score: number | null
  away_score: number | null
  admin_home_score: number | null
  admin_away_score: number | null
  effective_home_score: number | null
  effective_away_score: number | null
}

export interface League {
  id: number
  name: string
  invite_code: string
  tournament_key: string | null
}

export interface LeaderboardRow {
  rank: number
  user_id: number
  display_name: string | null
  email: string
  avatar_url: string | null
  total_points: number
  group_match_points: number
  knockout_match_points: number
  knockout_advance_points: number
  bonus_points: number
}

export interface MatchPrediction {
  match_uid: string
  home_score: number | null
  away_score: number | null
}

export interface MatchDetail extends MatchPrediction {
  stage: string | null
  home_team: string | null
  away_team: string | null
  actual_home: number | null
  actual_away: number | null
  points: number
  rag: 'green' | 'amber' | 'red' | null
}

export interface KnockoutPrediction {
  r32_teams: string[]
  r16_teams: string[]
  qf_teams: string[]
  sf_teams: string[]
  final_teams: string[]
  winner: string | null
}

export interface BonusPrediction {
  top_scorer: string | null
  top_assists: string | null
  total_goals: number | null
  total_red_cards: number | null
  final_referee: string | null
}

export interface BonusResult {
  top_scorer: string | null
  top_assists: string | null
  total_goals: number | null
  total_red_cards: number | null
  final_referee: string | null
}

export interface KnockoutResult {
  r32_teams: string[]
  r16_teams: string[]
  qf_teams: string[]
  sf_teams: string[]
  final_teams: string[]
  winner: string | null
}

export type RagStatus = 'green' | 'amber' | 'red' | null
