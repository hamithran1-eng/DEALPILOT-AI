import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Building,
  ArrowRight,
  Loader2,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithEmailOtp,
  verifyEmailOtp,
} from '../lib/supabase';

export const AuthView: React.FC = () => {
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState<'password' | 'otp' | 'register'>('password');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  // OTP flow states
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabaseActive = isSupabaseConfigured();

  // Password / Register submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (authMode === 'register') {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError('All fields are required.');
          setLoading(false);
          return;
        }
        await register(email.trim(), password, name.trim(), workspaceName.trim() || undefined);
      } else {
        if (!email.trim() || !password.trim()) {
          setError('Email and password are required.');
          setLoading(false);
          return;
        }
        await login(email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth flow
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      if (!supabaseActive) {
        throw new Error(
          'Supabase credentials required for Google OAuth. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment, or sign in via password/instant access.'
        );
      }
      const { error: googleErr } = await signInWithGoogle();
      if (googleErr) throw googleErr;
    } catch (err: any) {
      setError(err.message || 'Google OAuth failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email OTP flow: Step 1 (Send OTP)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!supabaseActive) {
        throw new Error(
          'Supabase is not yet configured for Email OTP delivery. Please configure your project credentials in Settings > Integrations or use Email + Password login.'
        );
      }
      const { error: otpErr } = await signInWithEmailOtp(email.trim());
      if (otpErr) throw otpErr;

      setOtpSent(true);
      setSuccess(`6-digit OTP code sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Email OTP flow: Step 2 (Verify OTP)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { session, error: verifyErr } = await verifyEmailOtp(email.trim(), otpToken.trim());
      if (verifyErr) throw verifyErr;

      setSuccess('Email verified successfully! Initializing workspace session...');
      // Sync session into application
      if (session?.user) {
        try {
          await login(session.user.email || email, 'supabase_oauth_session');
        } catch {
          await register(session.user.email || email, 'supabase_oauth_session', email.split('@')[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Evaluator quick access for seamless review
  const handleQuickDemoAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoEmail = 'alex.founder@codefusion.internal';
      const demoPass = 'dealpilot_secure_2026';
      try {
        await login(demoEmail, demoPass);
      } catch {
        await register(demoEmail, demoPass, 'Alex Vance', 'CodeFusion B2B Autopilot');
      }
    } catch (err: any) {
      setError(err.message || 'Quick access setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background glass lighting meshes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.2),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-500/30 border border-white/20">
            <svg
              className="w-6 h-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 19.5L12 16.5L22 19.5L12 2Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">DealPilot AI</h1>
          <p className="text-xs text-slate-400">
            SYNESIS 2026 · Team CodeFusion · Production Sales Autopilot
          </p>
        </div>

        {/* Card (Glass Dark) */}
        <div className="glass-dark rounded-2xl p-6.5 shadow-2xl space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-800 pb-2 gap-2 text-xs">
            <button
              onClick={() => {
                setAuthMode('password');
                setError(null);
                setSuccess(null);
              }}
              className={`pb-2 font-semibold border-b-2 transition-colors ${
                authMode === 'password'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('otp');
                setError(null);
                setSuccess(null);
              }}
              className={`pb-2 font-semibold border-b-2 transition-colors ${
                authMode === 'otp'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Email OTP
            </button>
            <button
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setSuccess(null);
              }}
              className={`pb-2 font-semibold border-b-2 transition-colors ${
                authMode === 'register'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-md transition-colors shadow-2xs"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google OAuth</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800" />
            <span className="shrink-0 mx-3 text-[10px] text-slate-500 uppercase tracking-wider">
              Or with credentials
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Form 1: Email + Password / Register */}
          {authMode !== 'otp' && (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Alex Vance"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Workspace Organization Name
                    </label>
                    <div className="relative">
                      <Building className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={e => setWorkspaceName(e.target.value)}
                        placeholder="CodeFusion Enterprise"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {authMode === 'register' ? 'Create Fresh Workspace' : 'Sign In to Workspace'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Form 2: Email OTP */}
          {authMode === 'otp' && (
            <div className="space-y-3.5 text-xs">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Email Address for One-Time Password
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="sales@yourdomain.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit Verification Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpToken}
                        onChange={e => setOtpToken(e.target.value)}
                        placeholder="123456"
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center tracking-widest text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-slate-200 mt-1"
                  >
                    Use different email address
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Quick Access Helper for Evaluators */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleQuickDemoAccess}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 rounded-md transition-colors border border-slate-700/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant Evaluator Access (Alex Vance)</span>
            </button>
            <span className="text-[10px] text-slate-500 block text-center mt-1">
              Enters an isolated test account with 0 fake leads and live AI intelligence.
            </span>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Supabase Auth (Google OAuth & OTP) · PostgreSQL Row Level Security</p>
        </div>
      </div>
    </div>
  );
};
