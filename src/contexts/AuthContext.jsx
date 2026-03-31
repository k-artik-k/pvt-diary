import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (!error) setProfile(data);
    return { data, error };
  }

  async function updateUsername(username) {
    const nextUsername = username.trim();
    if (!nextUsername) {
      return { data: null, error: { message: 'Username is required' } };
    }

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', nextUsername)
      .neq('id', user.id)
      .maybeSingle();

    if (existingError) {
      return { data: null, error: existingError };
    }

    if (existing) {
      return { data: null, error: { message: 'Username is already taken' } };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: nextUsername,
        display_name: nextUsername
      })
      .eq('id', user.id)
      .select()
      .single();

    if (!error) {
      setProfile(data);
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { username: nextUsername, display_name: nextUsername }
      });
      if (metadataError) {
        console.warn('Unable to sync auth metadata:', metadataError.message);
      }
    }

    return { data, error };
  }

  async function signUp(email, password, username) {
    const nextUsername = username.trim();
    if (!nextUsername) {
      return { data: null, error: { message: 'Username is required' } };
    }

    // Check username availability first
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', nextUsername)
      .maybeSingle();
    
    if (existing) {
      return { data: null, error: { message: 'Username is already taken' } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: nextUsername, display_name: nextUsername }
      }
    });
    return { data, error };
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { data, error };
  }

  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    return { data, error };
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    updateUsername,
    fetchProfile: () => user && fetchProfile(user.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
