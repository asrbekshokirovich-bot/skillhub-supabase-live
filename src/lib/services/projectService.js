import { projectRepository } from '../repositories/projectRepository';
import { triggerHaptic } from '../haptics';
import { query, where } from 'firebase/firestore';

class ProjectService {
  /**
   * Fetch all projects
   */
  async getAllProjects() {
    return await projectRepository.findAll();
  }

  /**
   * Fetch projects by developer assignee
   */
  async getProjectsByAssignee(assigneeName) {
    const q = query(projectRepository.getCollectionRef(), where('assignee', '==', assigneeName));
    return await projectRepository.findAll(q);
  }

  /**
   * Fetch projects by client name
   */
  async getProjectsByClient(clientName) {
    const q = query(projectRepository.getCollectionRef(), where('client', '==', clientName));
    return await projectRepository.findAll(q);
  }

  /**
   * Create a new project, appending audit timestamps and success haptics
   */
  async createProject(data) {
    try {
      const project = await projectRepository.create({
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      triggerHaptic('success');
      return project;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(id, data) {
    try {
      const updated = await projectRepository.update(id, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      triggerHaptic('light');
      return updated;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id) {
    try {
      await projectRepository.delete(id);
      triggerHaptic('heavy');
      return true;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }
}

export const projectService = new ProjectService();
