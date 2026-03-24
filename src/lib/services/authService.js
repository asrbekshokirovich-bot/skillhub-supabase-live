import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { userRepository } from '../repositories/userRepository';
import { handleApiError } from '../utils/errors';

class AuthService {
  /**
   * Uses a secondary app instance to provision new users without signing out the current Admin
   */
  async createSecondaryUser(username, role, password) {
    try {
      const secondaryAppName = 'SecondaryApp';
      const secondaryApp = getApps().find(a => a.name === secondaryAppName)
        || initializeApp({
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          }, secondaryAppName);
      
      const secondaryAuth = getAuth(secondaryApp);
      const email = `${username.trim().toLowerCase()}@skillhubapp.com`;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);

      // Link profile data
      await userRepository.set(userCredential.user.uid, {
        username: username.trim().toLowerCase(),
        name: username.trim().toLowerCase(),
        role,
        created_at: new Date().toISOString(),
      });

      await firebaseSignOut(secondaryAuth);
      return userCredential.user;
    } catch (err) {
      if (err.message && err.message.includes('already-in-use')) {
         handleApiError(new Error('That username is already taken. Please choose another.'), 'Auth Provisioning');
      }
      handleApiError(err, 'Auth Provisioning');
    }
  }
}

export const authService = new AuthService();
