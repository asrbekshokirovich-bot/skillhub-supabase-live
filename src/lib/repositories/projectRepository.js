import { BaseRepository } from './baseRepository';
import { query, where } from 'firebase/firestore';

class ProjectRepository extends BaseRepository {
  constructor() {
    super('projects');
  }

  /**
   * Domain specific query: Find all projects owned by a specific user
   */
  async findByOwner(userId) {
    const customQuery = query(this.getCollectionRef(), where('ownerId', '==', userId));
    return this.findAll(customQuery);
  }
}

export const projectRepository = new ProjectRepository();
