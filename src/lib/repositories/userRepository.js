import { BaseRepository } from './baseRepository';

class UserRepository extends BaseRepository {
  constructor() {
    super('profiles'); // User data is stored in 'profiles' collection
  }
}

export const userRepository = new UserRepository();
