import { supabase } from '../supabase';
import { storageService } from './storageService';

// ─────────────────────────────────────────────────────────────────────────
// voiceReportService — data layer for AI voice standups (public.voice_reports).
// Mirrors taskService: thin async methods over the supabase client.
// ─────────────────────────────────────────────────────────────────────────

const EXT_BY_MIME = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

class VoiceReportService {
  /** Upload the recorded audio blob; returns its public URL. */
  async uploadAudio(workerId, blob, mimeType) {
    const ext = EXT_BY_MIME[(mimeType || '').split(';')[0]] || 'webm';
    const fileId = (crypto?.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1e9)}`);
    const path = `voice-reports/${workerId}/${fileId}.${ext}`;
    const url = await storageService.uploadFile(path, blob);
    if (!url) throw new Error('Audio upload failed.');
    return url;
  }

  /** Create a draft report (status='draft') from the AI result. */
  async createDraft(payload) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('voice_reports')
      .insert({
        ...payload,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Patch any fields on a report (worker edits during review). */
  async updateReport(id, patch) {
    const { data, error } = await supabase
      .from('voice_reports')
      .update({ ...patch, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /** Worker approves: merge any edits and flip status to 'approved'. */
  async approve(id, patch = {}) {
    return this.updateReport(id, { ...patch, status: 'approved' });
  }

  /** Worker's own reports (newest first). */
  async getMyReports(workerId) {
    const { data, error } = await supabase
      .from('voice_reports')
      .select('*')
      .eq('workerId', workerId)
      .order('createdAt', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  /** Approved reports for the manager view (newest first). */
  async getApprovedReports(limit = 100) {
    const { data, error } = await supabase
      .from('voice_reports')
      .select('*')
      .eq('status', 'approved')
      .order('reportDate', { ascending: false })
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  /** Append one manager Q&A note to a report. */
  async appendManagerNote(id, note) {
    const { data: row, error: readErr } = await supabase
      .from('voice_reports')
      .select('managerNotes')
      .eq('id', id)
      .single();
    if (readErr) throw readErr;
    const notes = Array.isArray(row?.managerNotes) ? row.managerNotes : [];
    return this.updateReport(id, { managerNotes: [...notes, note] });
  }

  /**
   * Everything the AI needs to ground a worker's standup: their open tasks,
   * the projects those belong to, and their last few approved reports.
   */
  async getWorkerContext(workerId) {
    const ctx = { tasks: [], projects: [], recentReports: [] };

    // Open tasks assigned to this worker. NOTE: `.neq('isArchived', true)` would
    // silently drop rows where isArchived IS NULL (Postgres three-valued logic),
    // so match null-or-false explicitly to keep their task context.
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, projectId, dueDate')
      .eq('assignee', workerId)
      .or('isArchived.is.null,isArchived.eq.false')
      .not('status', 'in', '("Done","Completed")');
    ctx.tasks = tasks || [];

    // Titles of the projects those tasks belong to.
    const projectIds = [...new Set(ctx.tasks.map((t) => t.projectId).filter(Boolean))];
    if (projectIds.length) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title')
        .in('id', projectIds);
      ctx.projects = projects || [];
    }

    // Last few approved standups for continuity.
    const { data: recent } = await supabase
      .from('voice_reports')
      .select('reportDate, createdAt, today, blockers')
      .eq('workerId', workerId)
      .eq('status', 'approved')
      .order('createdAt', { ascending: false })
      .limit(3);
    ctx.recentReports = recent || [];

    return ctx;
  }
}

export const voiceReportService = new VoiceReportService();
