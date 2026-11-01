import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import type { Session } from '@supabase/supabase-js';

export type UserRole = 'counter' | 'cook';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  userRole: UserRole | null;
  userEmail: string | null;
  userId: string | null;
  cafeId: string | null;
  isPasswordReset: boolean;
  signOut: () => Promise<void>;
  updateRole: (newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const fetchRole = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role || 'counter');
        setCafeId(data.cafeId || 'patel-cafe-main');
      } else {
        // Default to counter if role endpoint fails (backward compat)
        setUserRole('counter');
        setCafeId('patel-cafe-main');
      }
    } catch {
      setUserRole('counter');
      setCafeId('patel-cafe-main');
    }
  }, []);

  useEffect(() => {
    // Detect password-reset flow from URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsPasswordReset(true);
    }

    // Check current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        setUserEmail(s.user?.email || null);
        fetchRole(s.access_token);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordReset(true);
      }
      setSession(s);
      if (s) {
        setUserEmail(s.user?.email || null);
        fetchRole(s.access_token);
      } else {
        setUserRole(null);
        setUserEmail(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    setUserEmail(null);
    setIsPasswordReset(false);
  }, []);

  const updateRole = useCallback(async (newRole: UserRole) => {
    setUserRole(newRole);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        await fetch(`${API_URL}/api/user-role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.access_token}`
          },
          body: JSON.stringify({ role: newRole })
        });
      }
    } catch (err) {
      console.error('Failed to update role on backend', err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      userRole,
      userEmail,
      userId: session?.user?.id || null,
      cafeId,
      isPasswordReset,
      signOut,
      updateRole,
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

