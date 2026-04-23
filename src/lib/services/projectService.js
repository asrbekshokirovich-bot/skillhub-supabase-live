import { supabase } from '../supabase';
import { triggerHaptic } from '../haptics';

class ProjectService {
  // Helper to map DB row to UI format
  _mapToUI(p) {
    if (!p) return null;
    return {
      id: p.id,
      name: p.title,
      client: p.description,
      status: p.status,
      progress: 0,
      tasks: 0,
      assignee: p.coverUrl || 'Unassigned',
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  }

  async getProject(id) {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, createdBy, isArchived, createdAt, updatedAt').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return this._mapToUI(data);
  }

  async getAllProjects() {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, createdBy, isArchived, createdAt, updatedAt').neq('isArchived', true).order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(this._mapToUI);
  }

  async getProjectsByAssignee(assigneeName) {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, createdBy, isArchived, createdAt, updatedAt').eq('coverUrl', assigneeName).neq('isArchived', true).order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(this._mapToUI);
  }

  async getProjectsByClient(clientName) {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, createdBy, isArchived, createdAt, updatedAt').eq('description', clientName).neq('isArchived', true).order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(this._mapToUI);
  }

  async createProject(projectData) {
    try {
      const { data, error } = await supabase.from('projects').insert({
        title: projectData.name,
        description: projectData.client,
        status: projectData.status,
        coverUrl: projectData.assignee,
        createdBy: projectData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).select().single();
      
      if (error) throw error;
      triggerHaptic('success');
      return this._mapToUI(data);
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  async updateProject(id, projectData) {
    try {
      const dbUpdate = { updatedAt: new Date().toISOString() };
      if (projectData.name !== undefined) dbUpdate.title = projectData.name;
      if (projectData.client !== undefined) dbUpdate.description = projectData.client;
      if (projectData.status !== undefined) dbUpdate.status = projectData.status;
      if (projectData.assignee !== undefined) dbUpdate.coverUrl = projectData.assignee;

      const { data, error } = await supabase.from('projects').update(dbUpdate).eq('id', id).select().single();
      
      if (error) throw error;
      triggerHaptic('light');
      return this._mapToUI(data);
    } catch (error) {
      triggerHaptic('error');
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      const { error } = await supabase.from('projects').update({ isArchived: true }).eq('id', id);
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
