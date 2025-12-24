'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_super_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, businessName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setUserProfile(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, businessName: string) => {
    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) return { error: authError.message };
      if (!authData.user) return { error: 'Failed to create user' };

      // If no session, email confirmation may be required
      if (!authData.session) {
        return { error: 'Please check your email to confirm your account before signing in' };
      }

      // Step 2: Use the secure signup function that bypasses RLS
      const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const uniqueSlug = `${slug}-${Date.now()}`;

      const { data: result, error: createError } = await (supabase as any).rpc('create_tenant_for_new_user', {
        user_id: authData.user.id,
        user_email: email,
        user_full_name: fullName,
        business_name: businessName,
        business_slug: uniqueSlug,
      });

      if (createError) {
        await supabase.auth.signOut();
        return { error: createError.message };
      }

      if (!result || !result.success) {
        await supabase.auth.signOut();
        return { error: 'Failed to create business account' };
      }

      // Fetch the user profile to update state
      await fetchUserProfile(authData.user.id);

      return { error: null };
    } catch (error: any) {
      await supabase.auth.signOut();
      return { error: error?.message || 'An unexpected error occurred' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    router.push('/login');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const isSuperAdmin = userProfile?.is_super_admin || false;

  return (
    <AuthContext.Provider value={{ user, session, userProfile, loading, isSuperAdmin, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
