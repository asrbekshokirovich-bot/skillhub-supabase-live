import { db } from '../firebase';
import { collection, doc, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { handleApiError } from '../utils/errors';

/**
 * Tasks are stored as a subcollection under a specific project: 
 * path: projects/{projectId}/tasks
 * Therefore, they don't cleanly extend BaseRepository's single-path model.
 */
class TaskRepository {
  
  getCollectionRef(projectId) {
    return collection(db, 'projects', projectId, 'tasks');
  }

  getDocRef(projectId, taskId) {
    return doc(db, 'projects', projectId, 'tasks', taskId);
  }

  async findByProject(projectId) {
    try {
      const q = query(this.getCollectionRef(projectId), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) {
      handleApiError(e, `findTasksByProject on ${projectId}`);
    }
  }

  async create(projectId, data) {
    try {
      const docRef = await addDoc(this.getCollectionRef(projectId), data);
      return { id: docRef.id, ...data };
    } catch (e) {
      handleApiError(e, `createTask on ${projectId}`);
    }
  }

  async update(projectId, taskId, data) {
    try {
      await updateDoc(this.getDocRef(projectId, taskId), data);
      return { id: taskId, ...data };
    } catch (e) {
      handleApiError(e, `updateTask on ${projectId}`);
    }
  }

  async delete(projectId, taskId) {
    try {
      await deleteDoc(this.getDocRef(projectId, taskId));
      return { success: true };
    } catch (e) {
      handleApiError(e, `deleteTask on ${projectId}`);
    }
  }
}

export const taskRepository = new TaskRepository();
