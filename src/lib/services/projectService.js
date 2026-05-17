import { supabase } from '../supabase';
// Haptic feedback belongs in the UI layer (component handlers), not in services.
// Services are pure data access — the UI decides what feels like a "save".

// DB columns (post-v11 cleanup):
//   id, title, client, assignee, status, startDate, dueDate, notes,
//   createdBy, members, isArchived, createdAt, updatedAt
//
// UI shape:
//   name (= title), client, assignee, projectDescription, clientNotes,
//   status, startDate, dueDate, progress, tasks, createdBy, createdAt, updatedAt
const SELECT_COLUMNS =
  'id, title, client, assignee, status, startDate, dueDate, notes, createdBy, isArchived, createdAt, updatedAt';

class ProjectService {
  _mapToUI(p) {
    if (!p) return null;

    // Parse notes — either JSON { projectDescription, clientNotes } or raw HTML.
    let projectDescription = '';
    let clientNotes = '';
    if (p.notes) {
      if (typeof p.notes === 'string' && p.notes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(p.notes);
          projectDescription = parsed.projectDescription || '';
          clientNotes = parsed.clientNotes || '';
        } catch {
          projectDescription = p.notes;
        }
      } else {
        projectDescription = p.notes;
      }
    }

    return {
      id: p.id,
      name: p.title,
      client: p.client || '',
      status: p.status,
      startDate: p.startDate,
      dueDate: p.dueDate,
      projectDescription,
      clientNotes,
      progress: 0,
      tasks: 0,
      assignee: p.assignee || 'Unassigned',
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async getProject(id) {
    const { data, error } = await supabase.from('projects').select(SELECT_COLUMNS).eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return this._mapToUI(data);
  }

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects').select(SELECT_COLUMNS)
      .neq('isArchived', true)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => this._mapToUI(p));
  }

  async getProjectsByAssignee(assigneeId) {
    const { data, error } = await supabase
      .from('projects').select(SELECT_COLUMNS)
      .eq('assignee', assigneeId)
      .neq('isArchived', true)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => this._mapToUI(p));
  }

  async getProjectsByClient(clientName) {
    const { data, error } = await supabase
      .from('projects').select(SELECT_COLUMNS)
      .eq('client', clientName)
      .neq('isArchived', true)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => this._mapToUI(p));
  }

  async createProject(projectData) {
    try {
      const notesPayload = JSON.stringify({
        projectDescription: projectData.projectDescription || '',
        clientNotes: projectData.clientNotes || '',
      });

      const { data, error } = await supabase.from('projects').insert({
        title: projectData.name,
        client: projectData.client,
        assignee: projectData.assignee,
        status: projectData.status,
        startDate: projectData.startDate,
        dueDate: projectData.dueDate,
        notes: notesPayload,
        createdBy: projectData.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).select(SELECT_COLUMNS).single();

      if (error) throw error;
      return this._mapToUI(data);
    } catch (error) {
      throw error;
    }
  }

  async updateProject(id, projectData) {
    try {
      const dbUpdate = { updatedAt: new Date().toISOString() };
      if (projectData.name !== undefined)      dbUpdate.title = projectData.name;
      if (projectData.client !== undefined)    dbUpdate.client = projectData.client;
      if (projectData.assignee !== undefined)  dbUpdate.assignee = projectData.assignee;
      if (projectData.status !== undefined)    dbUpdate.status = projectData.status;
      if (projectData.startDate !== undefined) dbUpdate.startDate = projectData.startDate;
      if (projectData.dueDate !== undefined)   dbUpdate.dueDate = projectData.dueDate;

      if (projectData.projectDescription !== undefined || projectData.clientNotes !== undefined) {
        const { data: existing } = await supabase.from('projects').select('notes').eq('id', id).single();
        let notes = { projectDescription: '', clientNotes: '' };

        if (existing?.notes) {
          if (typeof existing.notes === 'string' && existing.notes.trim().startsWith('{')) {
            try { notes = JSON.parse(existing.notes); } catch { notes.projectDescription = existing.notes; }
          } else {
            notes.projectDescription = existing.notes;
          }
        }

        if (projectData.projectDescription !== undefined) notes.projectDescription = projectData.projectDescription;
        if (projectData.clientNotes !== undefined)        notes.clientNotes = projectData.clientNotes;

        dbUpdate.notes = JSON.stringify(notes);
      }

      const { data, error } = await supabase.from('projects').update(dbUpdate).eq('id', id).select(SELECT_COLUMNS).single();

      if (error) throw error;
      return this._mapToUI(data);
    } catch (error) {
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      const { error } = await supabase.from('projects').update({ isArchived: true }).eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

export const projectService = new ProjectService();
