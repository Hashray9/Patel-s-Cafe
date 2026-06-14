import React, { useState } from 'react';
import { Coffee, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected login error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md neo-brutal-card bg-[#fffcf9] p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-primary-container text-on-primary-container p-2 rounded-md border-2 border-black flex items-center justify-center transform hover:rotate-12 transition-transform duration-200">
            <Coffee size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="font-headline-lg text-[26px] md:text-headline-lg font-bold tracking-tight text-on-surface select-none">
            Patel's Cafe
          </h1>
        </div>

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
              placeholder="name@patelcafe.com"
              className="neo-brutal-input w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="password">
              Password
            </label>
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
      </div>

      <div className="mt-8 text-center text-xs text-on-surface-variant select-none">
        Authorized personnel only. All access is audited and logged.
      </div>
    </div>
  );
};
