import { supabase } from '../supabase';

// Reads public.activity_log. RLS decides visibility: CEO sees everything,
// a worker sees only their own actions — so the same query works for both.
class ActivityService {
  async getRecent(limit = 300) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }
}

export const activityService = new ActivityService();
