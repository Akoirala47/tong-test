import { supabase } from '@/supabase/supabase';

// Note: In client components, prefer using the useAuth hook from AuthProvider
// This utility might be useful in server components or API routes if needed,
// but direct session checking is often preferred there.
export const getCurrentUser = async () => {
  // This gets the server-side session/user, might differ from client-side
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// It's often better to get the session which includes the user
export const getCurrentSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}
