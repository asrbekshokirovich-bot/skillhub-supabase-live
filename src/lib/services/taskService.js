import { supabase } from '../supabase';

class TaskService {
  async getTasksByProject(projectId) {
    const { data, error } = await supabase.from('tasks').select('id, projectId, title, description, status, urgency, assignee, startDate, dueDate, timeEstimated, tags, screenshotUrl, isApproved, isArchived, createdAt, updatedAt, comments, subtasks, notes, type, author, timeTracked, watchers, dependencies, checklists, coverUrl').eq('projectId', projectId).neq('isArchived', true).order('createdAt', { ascending: true });
    if (error) throw error;
    return data;
  }

  async createTask(projectId, taskData) {
    try {
      const { data, error } = await supabase.from('tasks').insert({
        ...taskData,
        projectId,
        isApproved: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).select().single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateTask(projectId, taskId, taskData) {
    try {
      const { data, error } = await supabase.from('tasks').update({
        ...taskData,
        updatedAt: new Date().toISOString()
      }).eq('id', taskId).select().single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async deleteTask(projectId, taskId) {
    try {
      const { error } = await supabase.from('tasks').update({ isArchived: true }).eq('id', taskId);
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export const taskService = new TaskService();
