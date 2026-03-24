import { userRepository } from '../repositories/userRepository';
import { query, where } from 'firebase/firestore';

class UserService {
  /**
   * Fetch all users who have the role of developer
   */
  async getDevelopers() {
    const customQuery = query(userRepository.getCollectionRef(), where('role', '==', 'developer'));
    return await userRepository.findAll(customQuery);
  }

  async getAllProfiles() {
    return await userRepository.findAll();
  }

  async deleteProfile(userId) {
    return await userRepository.delete(userId);
  }
}

export const userService = new UserService();
