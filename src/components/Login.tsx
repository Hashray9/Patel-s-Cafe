import React, { useState } from 'react';
import { Coffee, AlertCircle, Loader, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';

type LoginView = 'login' | 'forgot' | 'register';

export const Login: React.FC = () => {
  const [view, setView] = useState<LoginView>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Register-your-cafe state
  const [cafeName, setCafeName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regNeedsConfirm, setRegNeedsConfirm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected login error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);

    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo,
      });
      if (resetError) {
        setForgotError(resetError.message);
      } else {
        setForgotSent(true);
      }
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const name = cafeName.trim();
    if (name.length < 2) {
      setRegError('Please enter your cafe or restaurant name.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }

    setRegLoading(true);
    try {
      // The cafe itself is created right after the first sign-in (CreateCafe screen),
      // pre-filled with this name. If e-mail confirmation is off we are signed in now.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: { cafe_name: name },
          emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });
      if (signUpError) {
        setRegError(signUpError.message);
      } else if (!data.session) {
        setRegNeedsConfirm(true);
      }
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setRegLoading(false);
    }
  };

  const switchToRegister = () => {
    setRegEmail(email);
    setRegError(null);
    setRegNeedsConfirm(false);
    setError(null);
    setView('register');
  };

  const switchToForgot = () => {
    setForgotEmail(email); // pre-fill with whatever was typed
    setForgotError(null);
    setForgotSent(false);
    setError(null);
    setView('forgot');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md neo-brutal-card bg-[#fffcf9] p-6 md:p-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="bg-primary-container text-on-primary-container p-2 rounded-md border-2 border-black flex items-center justify-center transform hover:rotate-12 transition-transform duration-200">
            <Coffee size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="font-headline-lg text-[26px] md:text-headline-lg font-bold tracking-tight text-on-surface select-none">
            Patel's Cafe
          </h1>
        </div>

        {/* ── LOGIN VIEW ── */}
        {view === 'login' && (
          <>
            <div className="text-center">
              <h2 className="font-body-lg text-lg font-bold text-on-surface">Staff Portal</h2>
              <p className="font-body-md text-sm text-on-surface-variant mt-1">
                Please log in with your email and password to manage floor layouts, orders, and reports.
              </p>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container p-3 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
                <AlertCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                <span className="font-body-md text-sm font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="name@yourcafe.com"
                  className="neo-brutal-input w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-xs font-semibold text-on-surface-variant underline underline-offset-2 hover:text-on-surface transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="neo-brutal-input w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="neo-brutal-btn bg-primary text-on-primary font-bold py-3 mt-2 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin stroke-[2.5]" />
                    Verifying Session...
                  </>
                ) : (
                  'Authenticate'
                )}
              </button>
            </form>

            <div className="border-t-2 border-black/15 pt-4 text-center">
              <p className="font-body-md text-sm text-on-surface-variant">
                Own a cafe or restaurant?
              </p>
              <button
                type="button"
                onClick={switchToRegister}
                className="mt-1 text-sm font-bold text-on-surface underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
              >
                Register your cafe
              </button>
              <p className="font-body-md text-xs text-on-surface-variant mt-2">
                Staff: ask your cafe owner to invite your email.
              </p>
            </div>
          </>
        )}

        {/* ── REGISTER YOUR CAFE VIEW ── */}
        {view === 'register' && (
          <>
            <div className="text-center">
              <h2 className="font-body-lg text-lg font-bold text-on-surface">Register Your Cafe</h2>
              <p className="font-body-md text-sm text-on-surface-variant mt-1">
                Create an owner account. Your cafe gets its own private tables, menu, orders and staff.
              </p>
            </div>

            {regNeedsConfirm ? (
              <div className="bg-[#b2f0cf] text-[#006e3a] p-4 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
                <CheckCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                <span className="font-body-md text-sm font-semibold">
                  Almost done! We sent a confirmation link to <strong>{regEmail}</strong>. Open it, then log in to finish setting up <strong>{cafeName.trim()}</strong>.
                </span>
              </div>
            ) : (
              <>
                {regError && (
                  <div className="bg-error-container text-on-error-container p-3 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
                    <AlertCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                    <span className="font-body-md text-sm font-semibold">{regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="reg-cafe">
                      Cafe / Restaurant Name
                    </label>
                    <input
                      id="reg-cafe"
                      type="text"
                      value={cafeName}
                      onChange={(e) => setCafeName(e.target.value)}
                      required
                      maxLength={80}
                      disabled={regLoading}
                      placeholder="e.g. Sunrise Cafe"
                      className="neo-brutal-input w-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="reg-email">
                      Owner Email
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      disabled={regLoading}
                      placeholder="owner@yourcafe.com"
                      className="neo-brutal-input w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="reg-password">
                        Password
                      </label>
                      <input
                        id="reg-password"
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        disabled={regLoading}
                        placeholder="••••••••"
                        className="neo-brutal-input w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="reg-confirm">
                        Confirm
                      </label>
                      <input
                        id="reg-confirm"
                        type="password"
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        required
                        disabled={regLoading}
                        placeholder="••••••••"
                        className="neo-brutal-input w-full"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="neo-brutal-btn bg-primary text-on-primary font-bold py-3 mt-2 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {regLoading ? (
                      <>
                        <Loader size={18} className="animate-spin stroke-[2.5]" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Owner Account'
                    )}
                  </button>
                </form>
              </>
            )}

            <button
              type="button"
              onClick={() => setView('login')}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} className="stroke-[2.5]" />
              Back to Login
            </button>
          </>
        )}

        {/* ── FORGOT PASSWORD VIEW ── */}
        {view === 'forgot' && (
          <>
            <div className="text-center">
              <h2 className="font-body-lg text-lg font-bold text-on-surface">Reset Password</h2>
              <p className="font-body-md text-sm text-on-surface-variant mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {forgotSent ? (
              <div className="bg-[#b2f0cf] text-[#006e3a] p-4 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
                <CheckCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                <span className="font-body-md text-sm font-semibold">
                  Reset link sent to <strong>{forgotEmail}</strong>. Check your inbox and click the link to set a new password.
                </span>
              </div>
            ) : (
              <>
                {forgotError && (
                  <div className="bg-error-container text-on-error-container p-3 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
                    <AlertCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                    <span className="font-body-md text-sm font-semibold">{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="forgot-email">
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      disabled={forgotLoading}
                      placeholder="name@yourcafe.com"
                      className="neo-brutal-input w-full"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="neo-brutal-btn bg-primary text-on-primary font-bold py-3 mt-2 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader size={18} className="animate-spin stroke-[2.5]" />
                        Sending Link...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </form>
              </>
            )}

            <button
              type="button"
              onClick={() => setView('login')}
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} className="stroke-[2.5]" />
              Back to Login
            </button>
          </>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-on-surface-variant select-none">
        Authorized personnel only. All access is audited and logged.
      </div>
    </div>
  );
};
