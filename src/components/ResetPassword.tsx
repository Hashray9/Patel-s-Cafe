import React, { useState } from 'react';
import { Coffee, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Sign out so user logs in fresh with new password
        setTimeout(() => supabase.auth.signOut(), 2500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
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
          <h2 className="font-body-lg text-lg font-bold text-on-surface">Set New Password</h2>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Enter and confirm your new password below.
          </p>
        </div>

        {success ? (
          <div className="bg-[#b2f0cf] text-[#006e3a] p-4 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
            <CheckCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
            <span className="font-body-md text-sm font-semibold">
              Password updated! Redirecting you to login...
            </span>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-error-container text-on-error-container p-3 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
                <AlertCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
                <span className="font-body-md text-sm font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="new-password">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Min. 6 characters"
                  className="neo-brutal-input w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="confirm-password">
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Re-enter password"
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
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

