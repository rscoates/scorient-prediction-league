import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../api'
import type { User } from '../types'

export default function LoginPage() {
  const { login } = useAuth()
  const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true'

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    try {
      const resp = await api.googleLogin(credentialResponse.credential)
      login(resp.access_token, resp as unknown as User)
    } catch {
      alert('Login failed. Please try again.')
    }
  }

  const handleDevLogin = async () => {
    const email = prompt('Dev login — enter email:')
    if (!email) return
    try {
      const resp = await api.devLogin(email, email.split('@')[0])
      login(resp.access_token, resp as unknown as User)
    } catch {
      alert('Dev login failed.')
    }
  }

  return (
    <div className="min-h-screen bg-brand-950 flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <img src="/scorient-logo.png" alt="Scorient" className="h-24 mx-auto mb-6" />
        <h1 className="text-4xl font-serif text-white tracking-wide">Scorient</h1>
        <p className="text-brand-300 italic mt-2 text-lg">Dignitatem in Proelio</p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <h2 className="text-xl font-semibold text-brand-900 mb-2">Sign in to predict</h2>
        <p className="text-gray-500 text-sm mb-6">Use your Google account to get started</p>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogle}
            onError={() => alert('Google login failed.')}
            theme="outline"
            size="large"
            shape="rectangular"
            text="signin_with"
          />
        </div>

        {DEV_AUTH && (
          <button
            onClick={handleDevLogin}
            className="mt-4 text-sm text-brand-600 underline hover:text-brand-800"
          >
            Dev login (no password)
          </button>
        )}
      </div>

      <p className="text-brand-400 text-xs mt-8">World Cup 2026 — Prediction League</p>
    </div>
  )
}
