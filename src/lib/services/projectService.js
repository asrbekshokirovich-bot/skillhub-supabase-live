import { supabase } from '../supabase';
import { triggerHaptic } from '../haptics';

class ProjectService {
  _mapToUI(p) {
    if (!p) return null;
    let projectDescription = p.notes || '';
    let clientNotes = '';
    
    if (p.notes && p.notes.startsWith('{')) {
      try {
        const parsed = JSON.parse(p.notes);
        if (parsed.projectDescription !== undefined) {
          projectDescription = parsed.projectDescription;
          clientNotes = parsed.clientNotes || '';
        }
      } catch (e) {
        // Fallback to treating as raw HTML string if JSON parse fails
      }
    }

    return {
      id: p.id,
      name: p.title,
      client: p.description,
      status: p.status,
      startDate: p.startDate,
      projectDescription,
      clientNotes,
      progress: 0,
      tasks: 0,
      dueDate: p.dueDate,
      assignee: p.coverUrl || 'Unassigned',
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  }

  async getProject(id) {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, startDate, dueDate, notes, createdBy, isArchived, createdAt, updatedAt').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return this._mapToUI(data);
  }

  async getAllProjects() {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, startDate, dueDate, notes, createdBy, isArchived, createdAt, updatedAt').neq('isArchived', true).order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(this._mapToUI.bind(this));
  }

  async getProjectsByAssignee(assigneeName) {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, startDate, dueDate, notes, createdBy, isArchived, createdAt, updatedAt').eq('coverUrl', assigneeName).neq('isArchived', true).order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(this._mapToUI.bind(this));
  }

  async getProjectsByClient(clientName) {
    const { data, error } = await supabase.from('projects').select('id, title, description, status, coverUrl, startDate, dueDate, notes, createdBy, isArchived, createdAt, updatedAt').eq('description', clientName).neq('isArchived', true).order('createdAt', { ascending: false });
    if (error) throw error;
    return data.map(this._mapToUI.bind(this));
  }

  async createProject(projectData) {
    try {
      const notesPayload = JSON.stringify({
        projectDescription: projectData.projectDescription || '',
        clientNotes: projectData.clientNotes || ''
      });

      const { data, error } = await supabase.from('projects').insert({
        title: projectData.name,
        description: projectData.client,
        status: projectData.status,
        coverUrl: projectData.assignee,
        startDate: projectData.startDate,
        dueDate: projectData.dueDate,
        notes: notesPayload,
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
      if (projectData.startDate !== undefined) dbUpdate.startDate = projectData.startDate;
      if (projectData.dueDate !== undefined) dbUpdate.dueDate = projectData.dueDate;

      if (projectData.projectDescription !== undefined || projectData.clientNotes !== undefined) {
        const { data: existing } = await supabase.from('projects').select('notes').eq('id', id).single();
        let existingNotes = { projectDescription: '', clientNotes: '' };
        
        if (existing && existing.notes) {
          if (existing.notes.startsWith('{')) {
            try { 
              const parsed = JSON.parse(existing.notes); 
              if (parsed.projectDescription !== undefined) existingNotes = parsed;
              else existingNotes.projectDescription = existing.notes;
            } catch(e) { existingNotes.projectDescription = existing.notes; }
          } else {
            existingNotes.projectDescription = existing.notes;
          }
        }
        
        if (projectData.projectDescription !== undefined) existingNotes.projectDescription = projectData.projectDescription;
        if (projectData.clientNotes !== undefined) existingNotes.clientNotes = projectData.clientNotes;
        
        dbUpdate.notes = JSON.stringify(existingNotes);
      }

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
