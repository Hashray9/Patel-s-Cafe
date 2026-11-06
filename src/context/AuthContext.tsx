/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { api, errorMessage } from '../api';
import type { UserRole } from '../types';

export type { UserRole };

interface Membership {
  userId: string;
  role: UserRole | null;
  cafeId: string | null;
  cafeName: string | null;
}

interface MeResponse {
  id: string;
  email: string;
  role: UserRole | null;
  cafeId: string | null;
  cafeName: string | null;
}

interface AuthContextType {
  session: Session | null;
  /** True until we know who the user is AND which cafe/role they have. */
  loading: boolean;
  userEmail: string | null;
  userId: string | null;
  /** null when the signed-in account is not linked to any cafe yet. */
  userRole: UserRole | null;
  cafeId: string | null;
  cafeName: string | null;
  /** Error while loading the membership (network / server). */
  membershipError: string | null;
  /** Arrived through a password-recovery or invite e-mail link. */
  isPasswordReset: boolean;
  refreshMembership: () => Promise<void>;
  createCafe: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const hashIndicatesPasswordSetup = () => {
  const hash = window.location.hash;
  return hash.includes('type=recovery') || hash.includes('type=invite');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipError, setMembershipError] = useState<{ userId: string; message: string } | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(hashIndicatesPasswordSetup);

  const userId = session?.user?.id ?? null;

  const loadMembership = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) return;
    try {
      const me = await api<MeResponse>('/api/me');
      setMembership({ userId: me.id, role: me.role, cafeId: me.cafeId, cafeName: me.cafeName });
      setMembershipError(null);
    } catch (err) {
      setMembershipError({ userId: s.user.id, message: errorMessage(err, 'Could not load your account.') });
    }
  }, []);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately, so no separate getSession() is needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordReset(true);
      setSession(s);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // (Re)load the cafe membership whenever a different user signs in.
  useEffect(() => {
    // Fetch on user change; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) loadMembership();
  }, [userId, loadMembership]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMembership(null);
    setMembershipError(null);
    setIsPasswordReset(false);
  }, []);

  const createCafe = useCallback(async (name: string) => {
    const me = await api<MeResponse>('/api/cafes', { method: 'POST', body: JSON.stringify({ name }) });
    setMembership({ userId: me.id, role: me.role, cafeId: me.cafeId, cafeName: me.cafeName });
    setMembershipError(null);
  }, []);

  // Only trust membership/error state that belongs to the currently signed-in user.
  const currentMembership = membership && membership.userId === userId ? membership : null;
  const currentError = membershipError && membershipError.userId === userId ? membershipError.message : null;
  const loading = !authReady || (!!userId && !currentMembership && !currentError);

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      userEmail: session?.user?.email ?? null,
      userId,
      userRole: currentMembership?.role ?? null,
      cafeId: currentMembership?.cafeId ?? null,
      cafeName: currentMembership?.cafeName ?? null,
      membershipError: currentError,
      isPasswordReset,
      refreshMembership: loadMembership,
      createCafe,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
