import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Mail, KeyRound, Lock, ArrowLeft } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import Logo from '../components/Logo'
import api from '../lib/axios'

type View = 'login' | 'forgot' | 'otp' | 'reset'

export default function LoginPage() {
  const { login, isLoading, loginWithToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')

  // Forgot password states
  const [fpEmail, setFpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [fpLoading, setFpLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    if (!password) { setError('Password is required'); return }
    try {
      await login({ email: email.trim(), password })
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Login failed. Please try again.'
      setError(msg)
    }
  }

  const handleForgotRequest = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!fpEmail.trim()) { setError('Please enter your email'); return }
    setFpLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email: fpEmail.trim() })
      toast.success('OTP sent! Check your email inbox.')
      setView('otp')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setFpLoading(false)
    }
  }

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp.trim() || otp.length < 6) { setError('Please enter the 6-digit OTP'); return }
    if (!newPassword || newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setFpLoading(true)
    try {
      const res = await api.post('/api/auth/verify-otp', {
        email: fpEmail.trim(),
        otp: otp.trim(),
        new_password: newPassword
      })
      // Log user in automatically with returned token
      loginWithToken(res.data.access_token, res.data.user)
      toast.success('Password reset! Logging you in...')
      setTimeout(() => navigate('/dashboard', { replace: true }), 500)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Invalid or expired OTP'
      setError(msg)
    } finally {
      setFpLoading(false)
    }
  }

  const cardContent = () => {
    if (view === 'forgot') {
      return (
        <>
          <button onClick={() => { setView('login'); setError('') }} className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to Login
          </button>
          <div className="mb-8">
            <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
              <Mail size={22} className="text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Forgot Password</h2>
            <p className="text-sm text-gray-500">Enter your registered email and we'll send an OTP.</p>
          </div>
          {error && <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"><AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" /><p className="text-sm text-red-400">{error}</p></div>}
          <form onSubmit={handleForgotRequest} className="space-y-5">
            <div>
              <label className="form-label">Email Address</label>
              <input type="email" className="input-field" placeholder="you@company.com" value={fpEmail} onChange={e => setFpEmail(e.target.value)} disabled={fpLoading} />
            </div>
            <button type="submit" disabled={fpLoading} className="btn-primary flex items-center justify-center gap-2">
              {fpLoading ? <><Loader2 size={16} className="animate-spin" /> Sending OTP…</> : <><Mail size={16} /> Send OTP</>}
            </button>
          </form>
        </>
      )
    }

    if (view === 'otp') {
      return (
        <>
          <button onClick={() => { setView('forgot'); setError('') }} className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 mb-6 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="mb-8">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
              <KeyRound size={22} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter OTP</h2>
            <p className="text-sm text-gray-500">We sent a 6-digit code to <strong className="text-gray-700">{fpEmail}</strong>. Enter it below along with your new password.</p>
          </div>
          {error && <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6"><AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" /><p className="text-sm text-red-400">{error}</p></div>}
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div>
              <label className="form-label">OTP Code</label>
              <input
                type="text"
                className="input-field text-center text-3xl font-mono tracking-[1rem] py-4"
                placeholder="••••••"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={fpLoading}
              />
            </div>
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  disabled={fpLoading}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={fpLoading} className="btn-primary flex items-center justify-center gap-2">
              {fpLoading ? <><Loader2 size={16} className="animate-spin" /> Verifying…</> : <><Lock size={16} /> Reset Password</>}
            </button>
            <button type="button" onClick={handleForgotRequest} disabled={fpLoading} className="w-full text-sm text-brand-400 hover:text-brand-300 transition-colors text-center">
              Didn't receive it? Resend OTP
            </button>
          </form>
        </>
      )
    }

    // Default: Login view
    return (
      <>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500">Sign in to your account to continue</p>
        </div>
        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 animate-fade-in">
            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <label htmlFor="login-email" className="form-label">Email Address</label>
            <input id="login-email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} className="input-field" disabled={isLoading} />
          </div>
          <div>
            <label htmlFor="login-password" className="form-label">Password</label>
            <div className="relative">
              <input id="login-password" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="input-field pr-12" disabled={isLoading} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => { setView('forgot'); setFpEmail(email); setError('') }} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Forgot password?
            </button>
          </div>
          <button id="login-submit" type="submit" disabled={isLoading} className="btn-primary flex items-center justify-center gap-2">
            {isLoading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>
        <div className="divider my-6">or</div>
        <Link to="/register" id="go-to-register">
          <button className="btn-secondary flex items-center justify-center gap-2 text-sm">Create a new account</button>
        </Link>
        <div className="mt-6 p-3 rounded-xl bg-brand-900/30 border border-brand-800/50">
          <p className="text-xs text-gray-500 text-center">
            Demo admin — <span className="text-gray-400">yui@wer.com</span>{' / '}<span className="text-gray-400">your-password</span>
          </p>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-200/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-300/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/50 rounded-full blur-3xl" />
      </div>
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="glass-card p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-8">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">VendorBridge</h1>
              <p className="text-xs text-gray-500 font-medium">Procurement Platform</p>
            </div>
          </div>
          {cardContent()}
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">© {new Date().getFullYear()} VendorBridge. All rights reserved.</p>
      </div>
    </div>
  )
}
