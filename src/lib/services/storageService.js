import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleApiError } from '../utils/errors';

class StorageService {
  /**
   * Universal upload handler for arbitrary Storage buckets
   * Returns the absolute DL URL
   */
  async uploadFile(path, file) {
    try {
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
       handleApiError(error, `uploadFile to ${path}`);
    }
  }
}

export const storageService = new StorageService();
