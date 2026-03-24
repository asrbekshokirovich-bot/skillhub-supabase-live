import { supabase } from '../supabase';

class UserService {
  /**
   * Fetch all users who have the role of developer
   */
  async getDevelopers() {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'developer');
    if (error) throw error;
    return data;
  }

  async getAllProfiles() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data;
  }

  async deleteProfile(userId) {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    return true;
  }
}

export const userService = new UserService();
