import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured } from '../lib/supabase';
import { ADMIN_PATH, useNoIndex } from '../lib/admin';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
const WINDOW_MS = 10 * 60_000;
const STORE_KEY = 'watchpost-admin-attempts';

function readAttempts(): number[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as number[];
    return arr.filter((t) => Date.now() - t < WINDOW_MS);
  } catch {
    return [];
  }
}

export default function AdminLogin() {
  useNoIndex();
  const { signIn, user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user && isAdmin) nav(ADMIN_PATH, { replace: true });
  }, [loading, user, isAdmin, nav]);

  useEffect(() => {
    if (lockedUntil == null) return;
    const ms = lockedUntil - Date.now();
    const id = window.setTimeout(() => setLockedUntil(null), Math.max(0, ms));
    return () => window.clearTimeout(id);
  }, [lockedUntil]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) return;
    setBusy(true);
    setErr(null);
    // Small artificial delay blunts timing-based user enumeration.
    await new Promise((r) => setTimeout(r, 400));
    const msg = await signIn(email.trim().toLowerCase(), password);
    setBusy(false);
    if (msg) {
      const attempts = [...readAttempts(), Date.now()];
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(attempts));
      } catch {
        /* ignore */
      }
      if (attempts.length >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setErr('Too many failed attempts. Try again in a minute.');
      } else {
        // Generic message. avoids confirming whether the email exists.
        setErr('Invalid email or password.');
      }
    } else {
      try {
        localStorage.removeItem(STORE_KEY);
      } catch {
        /* ignore */
      }
      nav(ADMIN_PATH, { replace: true });
    }
  }

  const locked = lockedUntil != null;

  return (
    <div className="mx-auto max-w-md py-6 sm:py-10">
      <div className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
          <ShieldCheck className="size-3.5 text-brand-accent" aria-hidden />
          Restricted area
        </span>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Administrator sign in
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Authorized personnel only. All sign-in attempts are monitored.
        </p>
      </div>

      <div className="mt-8">
            {!isSupabaseConfigured && (
              <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900" role="alert">
                Supabase env vars are missing. Set them before signing in.
              </p>
            )}

            <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
              {/* Honeypot: bots fill it, humans never see it */}
              <input type="text" name="company" autoComplete="off" tabIndex={-1} aria-hidden="true" className="hidden" />

              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    id="email"
                    className="input pl-10"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    id="password"
                    className="input pl-10 pr-11"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </div>

              {err && (
                <p className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800" role="alert">
                  {err}
                </p>
              )}
              {!loading && user && !isAdmin && (
                <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900" role="alert">
                  This account is not authorized for this area.
                </p>
              )}

              <button type="submit" disabled={busy || locked} className="btn-primary w-full !py-3 text-[15px]">
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Signing in…
                  </>
                ) : locked ? (
                  'Locked. Try again shortly'
                ) : (
                  'Sign in securely'
                )}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              <Link to="/" className="underline underline-offset-4 hover:text-slate-800">
                ← Back to public status
              </Link>
            </p>
      </div>
    </div>
  );
}
