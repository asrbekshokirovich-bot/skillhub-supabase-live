import { supabase } from '../supabase';
import { triggerHaptic } from '../haptics';

class TaskService {
  async getTasksByProject(projectId) {
    const { data, error } = await supabase.from('tasks').select('*').eq('projectId', projectId).order('createdAt', { ascending: true });
    if (error) throw error;
    return data;
  }

  async createTask(projectId, taskData) {
    try {
      const { data, error } = await supabase.from('tasks').insert({
        ...taskData,
        projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).select().single();
      
      if (error) throw error;
      triggerHaptic('success');
      return data;
    } catch (error) {
      triggerHaptic('error');
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
      triggerHaptic('light');
      return data;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  async deleteTask(projectId, taskId) {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      triggerHaptic('heavy');
      return true;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }
}

export const taskService = new TaskService();
