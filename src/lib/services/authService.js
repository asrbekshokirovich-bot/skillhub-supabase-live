import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { handleApiError } from '../utils/errors';

class AuthService {
  /**
   * Uses a secondary, non-persisted client to provision new users
   * without signing out the current Admin's token session.
   */
  async createSecondaryUser(username, role, password) {
    try {
      const secondarySupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
      );
      
      const email = `${username.trim().toLowerCase()}@skillhubapp.com`;
      const { data, error } = await secondarySupabase.auth.signUp({
        email,
        password,
        // Pass role + name as user metadata. The handle_new_user DB trigger reads
        // raw_user_meta_data->>'role' / ->>'name' when populating public.users;
        // without this it always defaults to 'worker', so the chosen role was ignored.
        options: { data: { role, name: username.trim() } },
      });

      if (error) throw error;

      // The Supabase trigger handle_new_user automatically populates public.users
      // (reading the role/name metadata above), so we don't need to manually
      // insert here (which would fail due to RLS).

      return data.user;
    } catch (err) {
      if (err.message && err.message.includes('User already registered')) {
         handleApiError(new Error('That username is already taken. Please choose another.'), 'Auth Provisioning');
      } else {
         handleApiError(err, 'Auth Provisioning');
      }
    }
  }
}

export const authService = new AuthService();
