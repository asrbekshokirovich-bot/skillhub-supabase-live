import { taskRepository } from '../repositories/taskRepository';
import { triggerHaptic } from '../haptics';

class TaskService {
  /**
   * Fetch all tasks under a specific project
   */
  async getTasksByProject(projectId) {
    return await taskRepository.findByProject(projectId);
  }

  /**
   * Create a new task within a project
   */
  async createTask(projectId, data) {
    try {
      const task = await taskRepository.create(projectId, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      triggerHaptic('success');
      return task;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(projectId, taskId, data) {
    try {
      const updated = await taskRepository.update(projectId, taskId, {
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
   * Delete a task
   */
  async deleteTask(projectId, taskId) {
    try {
      await taskRepository.delete(projectId, taskId);
      triggerHaptic('heavy');
      return true;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }
}

export const taskService = new TaskService();
