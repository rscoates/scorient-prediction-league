import axios from 'axios'
import type {
  User, Tournament, Match, League, LeaderboardRow,
  MatchPrediction, KnockoutPrediction, BonusPrediction,
  BonusResult, KnockoutResult, ScoreSummary,
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

const http = axios.create({ baseURL: BASE })

// Attach JWT from localStorage on every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('scorient_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ───────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string
  user_id: number
  email: string
  display_name: string | null
  avatar_url: string | null
  is_admin: number
}

export const googleLogin = (id_token: string) =>
  http.post<AuthResponse>('/auth/google', { id_token }).then((r) => r.data)

export const devLogin = (email: string, display_name?: string) =>
  http.post<AuthResponse>('/auth/dev-login', { email, display_name }).then((r) => r.data)

export const getMe = () => http.get<User>('/auth/me').then((r) => r.data)

// ── Tournaments ────────────────────────────────────────────────────────────────

export const getTournaments = () =>
  http.get<Tournament[]>('/tournaments').then((r) => r.data)

export const getTournament = (key: string) =>
  http.get<Tournament>(`/tournaments/${key}`).then((r) => r.data)

export const setRoundDeadline = (key: string, roundId: number, deadline: string | null) =>
  http.patch(`/tournaments/${key}/rounds/${roundId}/deadline`, { deadline }).then((r) => r.data)

// ── Leagues ────────────────────────────────────────────────────────────────────

export const getMyLeagues = () => http.get<League[]>('/leagues').then((r) => r.data)

export const createLeague = (name: string, tournament_key: string) =>
  http.post<League>('/leagues', { name, tournament_key }).then((r) => r.data)

export const joinLeague = (invite_code: string) =>
  http.post<League>('/leagues/join', { invite_code }).then((r) => r.data)

export const getLeague = (id: number) =>
  http.get<League>(`/leagues/${id}`).then((r) => r.data)

export const getLeagueMembers = (id: number) =>
  http.get<User[]>(`/leagues/${id}/members`).then((r) => r.data)

export const getLeaderboard = (leagueId: number) =>
  http.get<LeaderboardRow[]>(`/leagues/${leagueId}/leaderboard`).then((r) => r.data)

// ── Matches ────────────────────────────────────────────────────────────────────

export const getMatches = (params?: { tournament_id?: number; stage?: string; group?: string }) =>
  http.get<Match[]>('/matches', { params }).then((r) => r.data)

export const overrideMatch = (matchUid: string, homeScore: number | null, awayScore: number | null) =>
  http.post<Match>(`/matches/${matchUid}/override`, {
    home_score: homeScore,
    away_score: awayScore,
  }).then((r) => r.data)

export const clearOverride = (matchUid: string) =>
  http.delete<Match>(`/matches/${matchUid}/override`).then((r) => r.data)

// ── Predictions ────────────────────────────────────────────────────────────────

export const getMyMatchPredictions = () =>
  http.get<MatchPrediction[]>('/predictions/matches').then((r) => r.data)

export const saveMatchPrediction = (matchUid: string, home: number | null, away: number | null) =>
  http.put<MatchPrediction>(`/predictions/matches/${matchUid}`, {
    home_score: home,
    away_score: away,
  }).then((r) => r.data)

export const getKnockoutPrediction = (tournamentKey: string, targetUserId?: number) =>
  http.get<KnockoutPrediction>(`/predictions/knockout/${tournamentKey}`, {
    params: targetUserId ? { target_user_id: targetUserId } : {},
  }).then((r) => r.data)

export const saveKnockoutPrediction = (tournamentKey: string, data: Partial<KnockoutPrediction>) =>
  http.put<KnockoutPrediction>(`/predictions/knockout/${tournamentKey}`, data).then((r) => r.data)

export const getBonusPrediction = (tournamentKey: string, targetUserId?: number) =>
  http.get<BonusPrediction>(`/predictions/bonus/${tournamentKey}`, {
    params: targetUserId ? { target_user_id: targetUserId } : {},
  }).then((r) => r.data)

export const saveBonusPrediction = (tournamentKey: string, data: Partial<BonusPrediction>) =>
  http.put<BonusPrediction>(`/predictions/bonus/${tournamentKey}`, data).then((r) => r.data)

export const getMyScore = (tournamentKey: string) =>
  http.get<ScoreSummary>(`/predictions/score/${tournamentKey}`).then((r) => r.data)

// ── Admin ──────────────────────────────────────────────────────────────────────

export const adminGetUsers = () =>
  http.get<User[]>('/admin/users').then((r) => r.data)

export const adminPromoteUser = (userId: number) =>
  http.post<User>(`/admin/users/${userId}/promote`).then((r) => r.data)

export const adminDemoteUser = (userId: number) =>
  http.post<User>(`/admin/users/${userId}/demote`).then((r) => r.data)

export const adminGetBonusResult = (key: string) =>
  http.get<BonusResult>(`/admin/results/bonus/${key}`).then((r) => r.data)

export const adminSetBonusResult = (key: string, data: Partial<BonusResult>) =>
  http.put(`/admin/results/bonus/${key}`, data).then((r) => r.data)

export const adminGetKnockoutResult = (key: string) =>
  http.get<KnockoutResult>(`/admin/results/knockout/${key}`).then((r) => r.data)

export const adminSetKnockoutResult = (key: string, data: Partial<KnockoutResult>) =>
  http.put(`/admin/results/knockout/${key}`, data).then((r) => r.data)

export const adminRunIngest = () =>
  http.post('/admin/ingest').then((r) => r.data)

// ── Export ─────────────────────────────────────────────────────────────────────

export const exportCsv = (leagueId: number) => {
  window.open(`${BASE}/export/league/${leagueId}/csv`, '_blank')
}

export const exportJson = (leagueId: number) => {
  window.open(`${BASE}/export/league/${leagueId}/json`, '_blank')
}
