import { supabase } from '../supabase';
import { triggerHaptic } from '../haptics';

class ProjectService {
  async getAllProjects() {
    const { data, error } = await supabase.from('projects').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getProjectsByAssignee(assigneeName) {
    const { data, error } = await supabase.from('projects').select('*').eq('assignee', assigneeName).order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
  }

  async getProjectsByClient(clientName) {
    const { data, error } = await supabase.from('projects').select('*').eq('client', clientName).order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
  }

  async createProject(projectData) {
    try {
      const { data, error } = await supabase.from('projects').insert({
        ...projectData,
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

  async updateProject(id, projectData) {
    try {
      const { data, error } = await supabase.from('projects').update({
        ...projectData,
        updatedAt: new Date().toISOString()
      }).eq('id', id).select().single();
      
      if (error) throw error;
      triggerHaptic('light');
      return data;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      triggerHaptic('heavy');
      return true;
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }
}

export const projectService = new ProjectService();
