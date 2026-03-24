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
      });

      if (error) throw error;
      
      const userId = data.user.id;
      
      // Link profile data natively via Postgres
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        email,
        name: username.trim().toLowerCase(),
        role: role
      });

      if (profileError) throw profileError;

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
