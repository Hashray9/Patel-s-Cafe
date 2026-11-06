import React, { useState } from 'react';
import { Coffee, AlertCircle, Loader, LogOut, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api';

/**
 * Shown to a signed-in account that is not linked to any cafe yet:
 * either a new owner finishing registration, or someone who signed up
 * without being invited by a cafe.
 */
export const CreateCafe: React.FC = () => {
  const { session, userEmail, createCafe, signOut, refreshMembership } = useAuth();
  const suggestedName = typeof session?.user?.user_metadata?.cafe_name === 'string'
    ? session.user.user_metadata.cafe_name
    : '';

  const [name, setName] = useState<string>(suggestedName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Please enter your cafe or restaurant name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createCafe(trimmed);
    } catch (err) {
      setError(errorMessage(err, 'Could not create your cafe.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md neo-brutal-card bg-[#fffcf9] p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-center gap-3">
          <div className="bg-primary-container text-on-primary-container p-2 rounded-md border-2 border-black flex items-center justify-center">
            <Coffee size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="font-headline-lg text-[26px] font-bold tracking-tight text-on-surface select-none">
            Set Up Your Cafe
          </h1>
        </div>

        <p className="font-body-md text-sm text-on-surface-variant text-center">
          Signed in as <strong className="text-on-surface">{userEmail}</strong>. Create your cafe to become its
          owner — you can then add tables, build your menu and invite counter and kitchen staff.
        </p>

        {error && (
          <div className="bg-error-container text-on-error-container p-3 border-3 border-black flex items-start gap-2 rounded shadow-[2px_2px_0px_0px_#000000]">
            <AlertCircle size={20} className="stroke-[2.5] shrink-0 mt-0.5" />
            <span className="font-body-md text-sm font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-label-bold text-sm font-bold text-on-surface" htmlFor="cafe-name">
              Cafe / Restaurant Name
            </label>
            <input
              id="cafe-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              disabled={loading}
              placeholder="e.g. Sunrise Cafe"
              className="neo-brutal-input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="neo-brutal-btn bg-primary text-on-primary font-bold py-3 rounded transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin stroke-[2.5]" />
                Creating Cafe...
              </>
            ) : (
              <>
                <Store size={18} className="stroke-[2.5]" />
                Create My Cafe
              </>
            )}
          </button>
        </form>

        <div className="border-t-2 border-black/15 pt-4 text-center space-y-2">
          <p className="font-body-md text-xs text-on-surface-variant">
            Work at a cafe that already uses this app? Don't create a new one — ask the owner to invite
            <strong> {userEmail}</strong> from Settings → Staff.
          </p>
          <button
            type="button"
            onClick={refreshMembership}
            className="block mx-auto text-sm font-bold text-on-surface underline underline-offset-2 hover:text-primary transition-colors cursor-pointer"
          >
            I've been invited — check again
          </button>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <LogOut size={14} className="stroke-[2.5]" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCafe;
