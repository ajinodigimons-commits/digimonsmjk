import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AppUser {
  id: string;
  name: string;
  role: 'user' | 'user2' | 'admin';
  section?: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isUser2: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

const buildAppUser = async (supaUser: SupabaseUser): Promise<AppUser> => {
  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, section')
    .eq('id', supaUser.id)
    .maybeSingle();

  // Fetch role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supaUser.id)
    .maybeSingle();

  return {
    id: supaUser.id,
    name: profile?.name || supaUser.email || 'User',
    role: (roleData?.role as 'admin' | 'user' | 'user2') || 'user',
    section: profile?.section || undefined,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Use setTimeout to avoid deadlock with Supabase client
        setTimeout(async () => {
          const appUser = await buildAppUser(session.user);
          setUser(appUser);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await buildAppUser(session.user);
        setUser(appUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const appUser = await buildAppUser(data.user);
      setUser(appUser);
    }
    return {};
  }, []);




  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'admin', isUser2: user?.role === 'user2' }}>
      {children}
    </AuthContext.Provider>
  );
};
