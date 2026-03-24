import { supabase } from '../supabase';
import { handleApiError } from '../utils/errors';

class StorageService {
  /**
   * Universal upload handler for Supabase storage buckets
   * Returns the absolute Public DL URL
   */
  async uploadFile(path, file) {
    try {
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      const { error } = await supabase.storage.from('skillhub-bucket').upload(cleanPath, file, {
        upsert: true
      });
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage.from('skillhub-bucket').getPublicUrl(cleanPath);
      return publicUrlData.publicUrl;
    } catch (error) {
       handleApiError(error, `uploadFile to ${path}`);
    }
  }
}

export const storageService = new StorageService();
