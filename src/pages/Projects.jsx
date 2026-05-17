// ─────────────────────────────────────────────────────────────────────────
// Projects (list page) — denser cards, clean create-project form.
//
// Drop-in replacement for src/pages/Projects.jsx.
// Same data fetching (projectService / userService), same vault / settings /
// reassign sub-modals, same routing.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Plus, Loader2, Users, Key, Settings, FileText, X,
} from 'lucide-react';
import { projectService } from '../lib/services/projectService';
import { userService } from '../lib/services/userService';
import ProjectVault from './ProjectVault';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import { useSystem } from '../components/SystemUI';
import DOMPurify from 'dompurify';
import { maskDateInput as formatToDateMask, parseDDMMYYYYtoISO } from '../lib/utils/date';

export default function Projects({ currentUser }) {
  const { toast } = useSystem();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startType, setStartType] = useState('now');
  const [startDate, setStartDate] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [expandedNotes, setExpandedNotes] = useState({});
  const [editingNotes, setEditingNotes] = useState({});

  // Sub-modals
  const [reassignProjectId, setReassignProjectId] = useState(null);
  const [newAssignee, setNewAssignee] = useState('');
  const [vaultProjectId, setVaultProjectId] = useState(null);
  const [vaultProjectName, setVaultProjectName] = useState('');
  const [settingsProject, setSettingsProject] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  const handleRichTextPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'div', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'target'], KEEP_CONTENT: true,
      });
      document.execCommand('insertHTML', false, clean);
    } else if (text) {
      document.execCommand('insertHTML', false, text.replace(/\n/g, '<br>'));
    }
  };

  const fetchUsers = useCallback(async () => {
    try { const devs = await userService.getWorkers(); setUsers(devs); }
    catch (err) { console.error('Error fetching devs:', err); }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      let data = [];
      const role = currentUser?.role;
      const name = currentUser?.name || '';
      if (role === 'ceo')         data = await projectService.getAllProjects();
      else if (role === 'worker') data = await projectService.getProjectsByAssignee(currentUser?.id);
      else if (role === 'client') data = await projectService.getProjectsByClient(name);
      else                         data = await projectService.getAllProjects();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchUsers(); fetchProjects(); }, [fetchUsers, fetchProjects]);

  const handleUpdateNotes = async (projectId, value) => {
    try {
      await projectService.updateProject(projectId, { clientNotes: value });
      setProjects(projects.map(p => p.id === projectId ? { ...p, clientNotes: value } : p));
    } catch (err) { toast.error('Failed to save notes'); }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;
    setIsSubmitting(true);
    try {
      const isStartLater = startType === 'later';
      let parsedStartDate;
      if (isStartLater) {
        try { parsedStartDate = parseDDMMYYYYtoISO(startDate); }
        catch { toast.error('Please enter a valid start date (DD/MM/YYYY).'); setIsSubmitting(false); return; }
      } else { parsedStartDate = new Date().toISOString(); }

      await projectService.createProject({
        name: projectName.trim(),
        client: clientName.trim(),
        status: isStartLater ? 'Undone' : 'In Progress',
        startDate: parsedStartDate,
        projectDescription,
        clientNotes,
        progress: 0, tasks: 0,
        assignee: assignee || 'Unassigned',
        createdBy: currentUser?.id,
      });

      setProjectName(''); setClientName(''); setAssignee('');
      setStartType('now'); setStartDate(''); setProjectDescription(''); setClientNotes('');
      setShowForm(false);
      fetchProjects();
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignProjectId) return;
    try {
      await projectService.updateProject(reassignProjectId, { assignee: newAssignee || 'Unassigned' });
      setReassignProjectId(null); setNewAssignee('');
      fetchProjects();
    } catch (err) { console.error('Error reassigning:', err); toast.error('Failed to reassign project'); }
  };

  // Filter pipeline
  const filtered = projects.filter(p => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'in-progress') return p.status === 'In Progress';
    if (statusFilter === 'starting')    return p.status === 'Undone';
    if (statusFilter === 'done')        return p.status === 'Done' || p.status === 'Completed';
    return true;
  });

  return (
    <>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.015em', margin: 0 }}>
              Projects
            </h2>
            <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} ·{' '}
              {projects.filter(p => p.status === 'In Progress').length} in progress
            </p>
          </div>
          {currentUser?.role === 'ceo' && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14}/> New project
            </button>
          )}
        </div>

        {/* FILTERS */}
        {projects.length > 0 && (
          <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)', width: 'fit-content',
          }}>
            {[
              { id: 'all',         label: 'All',         count: projects.length },
              { id: 'in-progress', label: 'In progress', count: projects.filter(p => p.status === 'In Progress').length },
              { id: 'starting',    label: 'Starting',    count: projects.filter(p => p.status === 'Undone').length },
              { id: 'done',        label: 'Done',        count: projects.filter(p => p.status === 'Done' || p.status === 'Completed').length },
            ].map(t => (
              <button key={t.id} onClick={() => setStatusFilter(t.id)}
                style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                  background: statusFilter === t.id ? 'var(--bg-primary)' : 'transparent',
                  color: statusFilter === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: statusFilter === t.id ? '1px solid var(--border-color)' : '1px solid transparent',
                  fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                }}>
                {t.label}
                <span style={{ marginLeft: 6, color: 'var(--text-tertiary)', fontWeight: 500 }}>{t.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* PROJECTS GRID */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }}/>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={statusFilter === 'all' ? 'No active projects' : `No ${statusFilter.replace('-', ' ')} projects`}
            body="Create a new project workspace to get started."
            cta={currentUser?.role === 'ceo' && <button className="btn btn-primary"
              onClick={() => setShowForm(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14}/>Create project
            </button>}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                users={users}
                currentUser={currentUser}
                isNotesOpen={!!expandedNotes[project.id]}
                onNavigate={() => navigate(`/projects/${project.id}`)}
                onOpenSettings={() => setSettingsProject(project)}
                onOpenVault={() => { setVaultProjectName(project.name); setVaultProjectId(project.id); }}
                onReassign={() => {
                  setReassignProjectId(project.id);
                  setNewAssignee(project.assignee === 'Unassigned' ? '' : project.assignee);
                }}
                onApproveStart={async () => {
                  await projectService.updateProject(project.id, { status: 'In Progress' });
                  fetchProjects();
                }}
                onToggleNotes={() => {
                  setExpandedNotes(prev => ({ ...prev, [project.id]: !prev[project.id] }));
                  if (!editingNotes[project.id] && project.clientNotes) {
                    setEditingNotes(prev => ({ ...prev, [project.id]: project.clientNotes }));
                  }
                }}
                notesValue={editingNotes[project.id] !== undefined ? editingNotes[project.id] : (project.clientNotes || '')}
                onChangeNotes={(v) => setEditingNotes(prev => ({ ...prev, [project.id]: v }))}
                onSaveNotes={(v) => handleUpdateNotes(project.id, v)}
              />
            ))}
          </div>
        )}
      </div>

      {/* CREATE PROJECT MODAL */}
      {showForm && (
        <CreateProjectModal
          users={users}
          projectName={projectName}
          clientName={clientName}
          assignee={assignee}
          startType={startType}
          startDate={startDate}
          projectDescription={projectDescription}
          clientNotes={clientNotes}
          isSubmitting={isSubmitting}
          setProjectName={setProjectName}
          setClientName={setClientName}
          setAssignee={setAssignee}
          setStartType={setStartType}
          setStartDate={setStartDate}
          setClientNotes={setClientNotes}
          setProjectDescription={setProjectDescription}
          handleSubmit={handleCreateProject}
          handleRichTextPaste={handleRichTextPaste}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* REASSIGN MODAL */}
      {reassignProjectId && (
        <div onClick={() => setReassignProjectId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              minWidth: 320, maxWidth: 420, width: '100%',
              background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
              padding: 20,
            }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Reassign lead worker
            </h3>
            <p style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Select a new lead worker for this project.
            </p>
            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)}
              className="input" style={{ marginTop: 14 }}>
              <option value="">Unassigned</option>
              {users.map(dev => <option key={dev.id} value={dev.id}>{dev.name}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setReassignProjectId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReassign}>Save</button>
            </div>
          </div>
        </div>
      )}

      {vaultProjectId && (currentUser?.role === 'ceo' || currentUser?.role === 'worker') && (
        <ProjectVault projectId={vaultProjectId} projectName={vaultProjectName}
          onClose={() => { setVaultProjectId(null); setVaultProjectName(''); }}/>
      )}

      {settingsProject && (
        <ProjectSettingsModal
          project={settingsProject}
          onClose={() => setSettingsProject(null)}
          onProjectUpdated={(updated) => {
            setProjects(projects.map(p => p.id === updated.id ? updated : p));
            setSettingsProject(null);
          }}
          onTasksGenerated={fetchProjects}
          onProjectDeleted={(projectId) => {
            setProjects(projects.filter(p => p.id !== projectId));
            setSettingsProject(null);
          }}
        />
      )}
    </>
  );
}

// ── Project Card ─────────────────────────────────────────────────────────

const ProjectCard = ({
  project, users, currentUser, isNotesOpen,
  onNavigate, onOpenSettings, onOpenVault, onReassign, onApproveStart,
  onToggleNotes, notesValue, onChangeNotes, onSaveNotes,
}) => {
  const lead = users.find(u => u.id === project.assignee);
  const leadName = lead?.name || (project.assignee !== 'Unassigned' ? project.assignee : null);
  const initial = String(leadName || '?').charAt(0).toUpperCase();

  const startDate = project.startDate ? new Date(project.startDate) : null;
  const startsLater = project.status === 'Undone' && startDate && startDate > new Date();
  const pendingStart = project.status === 'Undone' && startDate && startDate <= new Date();
  const statusDot =
    project.status === 'Done'         ? 'var(--accent-success)' :
    project.status === 'In Progress'  ? 'var(--accent-primary)' :
                                         'var(--text-tertiary)';
  const statusLabel = pendingStart ? 'Pending start' : startsLater ? 'Starts soon' : (project.status === 'Undone' ? 'Not started' : project.status);

  return (
    <div className="hover-elevate"
      style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: 'pointer',
      }}
      onClick={onNavigate}>
      {/* TOP: icon + name + settings */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
            background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
            border: '1px solid var(--accent-primary-border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.95rem', fontWeight: 700,
          }}>
            {String(project.name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.005em',
              color: 'var(--text-primary)', lineHeight: 1.25,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{project.name}</div>
            <div style={{
              fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{project.client}</div>
          </div>
        </div>
        {currentUser?.role === 'ceo' && (
          <IconBtn title="Settings" onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}>
            <Settings size={14}/>
          </IconBtn>
        )}
      </div>

      {/* STATUS + LEAD */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 9px', borderRadius: 999,
          fontSize: '0.6875rem', fontWeight: 600,
          color: 'var(--text-secondary)', background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot }}/>
          {statusLabel}
        </span>
        {leadName ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
              border: '1px solid var(--accent-primary-border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>{initial}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {leadName.split(' ')[0]}
            </span>
          </div>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            <Users size={11}/>Unassigned
          </span>
        )}
      </div>

      {/* PROGRESS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Progress
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {project.progress}%
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-tertiary)' }}>
          <div style={{
            width: `${project.progress || 0}%`, height: '100%', borderRadius: 999,
            background: project.progress === 100 ? 'var(--accent-success)' : 'var(--accent-primary)',
            transition: 'width 0.4s ease',
          }}/>
        </div>
        <div style={{ marginTop: 5, fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
          {project.tasks || 0} active tasks
        </div>
      </div>

      {/* Pending start CTA (CEO only) */}
      {pendingStart && currentUser?.role === 'ceo' && (
        <button onClick={(e) => { e.stopPropagation(); onApproveStart(); }}
          className="btn"
          style={{
            padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700,
            background: 'var(--accent-warning-text)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-sm)', width: '100%',
          }}>
          Approve start
        </button>
      )}

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: 6, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
        <button onClick={(e) => { e.stopPropagation(); onNavigate(); }}
          className="btn btn-secondary"
          style={{ flex: 1, fontSize: '0.75rem', padding: '5px 8px' }}>
          Open
        </button>
        {currentUser?.role === 'ceo' && (
          <>
            <IconBtn title="Reassign" onClick={(e) => { e.stopPropagation(); onReassign(); }}><Users size={13}/></IconBtn>
            <IconBtn title="Vault" onClick={(e) => { e.stopPropagation(); onOpenVault(); }}><Key size={13}/></IconBtn>
            <IconBtn title="Notes" active={isNotesOpen} onClick={(e) => { e.stopPropagation(); onToggleNotes(); }}><FileText size={13}/></IconBtn>
          </>
        )}
        {currentUser?.role === 'worker' && (
          <IconBtn title="Vault" onClick={(e) => { e.stopPropagation(); onOpenVault(); }}><Key size={13}/></IconBtn>
        )}
      </div>

      {/* NOTES */}
      {isNotesOpen && currentUser?.role === 'ceo' && (
        <textarea
          onClick={(e) => e.stopPropagation()}
          value={notesValue}
          onChange={(e) => onChangeNotes(e.target.value)}
          onBlur={(e) => onSaveNotes(e.target.value)}
          placeholder="Jot down notes from the client…"
          style={{
            padding: 10, fontSize: '0.8125rem', minHeight: 100, resize: 'vertical',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
            fontFamily: 'inherit', outline: 'none',
          }}
        />
      )}
    </div>
  );
};

// ── Create Project Modal ─────────────────────────────────────────────────

const CreateProjectModal = ({
  users, projectName, clientName, assignee, startType, startDate,
  projectDescription, clientNotes, isSubmitting,
  setProjectName, setClientName, setAssignee, setStartType, setStartDate,
  setClientNotes, setProjectDescription,
  handleSubmit, handleRichTextPaste, onClose,
}) => (
  <div onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
    <div onClick={e => e.stopPropagation()}
      style={{
        width: '95vw', maxWidth: 680, maxHeight: '92vh',
        background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
      <div style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--text-tertiary)',
          }}>New project</div>
          <div style={{ marginTop: 2, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Create a project workspace
          </div>
        </div>
        <button type="button" onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
          }}><X size={14}/></button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="custom-scrollbar"
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FieldLabel label="Project name">
              <input type="text" className="input" value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Website Redesign" required/>
            </FieldLabel>
            <FieldLabel label="Client name">
              <input type="text" className="input" value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Corp" required/>
            </FieldLabel>
          </div>

          <FieldLabel label="Assigned worker">
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="input">
              <option value="">Unassigned</option>
              {users.map(dev => <option key={dev.id} value={dev.id}>{dev.name}</option>)}
            </select>
          </FieldLabel>

          <FieldLabel label="Project start">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'now', label: 'Start now' },
                { id: 'later', label: 'Plan for later' },
              ].map(opt => (
                <button key={opt.id} type="button" onClick={() => setStartType(opt.id)}
                  style={{
                    flex: 1, height: 40, padding: '0 14px',
                    background: startType === opt.id ? 'var(--bg-secondary)' : 'transparent',
                    color: startType === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${startType === opt.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    boxShadow: startType === opt.id ? '0 0 0 2px var(--accent-primary-muted)' : 'none',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>{opt.label}</button>
              ))}
            </div>
            {startType === 'later' && (
              <input type="text" className="input" style={{ marginTop: 10 }}
                placeholder="DD/MM/YYYY" value={startDate}
                onChange={(e) => setStartDate(formatToDateMask(e.target.value))}
                required maxLength={10}/>
            )}
          </FieldLabel>

          <FieldLabel label="Client notes (initial meeting)" hint="optional">
            <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)}
              className="input" placeholder="Jot down raw notes from your initial client call…"
              style={{ minHeight: 80, resize: 'vertical', padding: '10px 12px' }}/>
          </FieldLabel>

          <FieldLabel label="Project description (phased plan)" hint="optional">
            <div style={{ position: 'relative' }}>
              {!projectDescription.trim() && (
                <div style={{
                  position: 'absolute', top: 14, left: 14, pointerEvents: 'none',
                  color: 'var(--text-tertiary)', fontSize: 14, fontStyle: 'italic',
                }}>Write the phased plan and project details here…</div>
              )}
              <div contentEditable suppressContentEditableWarning
                onBlur={e => setProjectDescription(e.currentTarget.innerHTML)}
                onPaste={handleRichTextPaste}
                className="rich-text-editor custom-scrollbar"
                style={{
                  width: '100%', minHeight: 140, padding: 14,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  fontSize: 14, lineHeight: 1.6, outline: 'none', cursor: 'text',
                }}
              />
            </div>
          </FieldLabel>
        </div>

        <div style={{
          padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
        }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary"
            disabled={isSubmitting || !projectName || !clientName}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {isSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
            {isSubmitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// ── Helpers ──────────────────────────────────────────────────────────────

const FieldLabel = ({ label, hint, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
      display: 'flex', alignItems: 'baseline', gap: 6,
    }}>
      {label}
      {hint && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{hint}</span>}
    </label>
    {children}
  </div>
);

const IconBtn = ({ children, onClick, title, active }) => (
  <button type="button" onClick={onClick} title={title}
    style={{
      width: 28, height: 28, padding: 0, borderRadius: 'var(--radius-sm)',
      background: active ? 'var(--accent-primary-muted)' : 'transparent',
      color: active ? 'var(--accent-primary-text)' : 'var(--text-secondary)',
      border: active ? '1px solid var(--accent-primary-border)' : '1px solid transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
    {children}
  </button>
);

const EmptyState = ({ title, body, cta }) => (
  <div style={{
    padding: '4rem 2rem', textAlign: 'center',
    background: 'transparent', border: '2px dashed var(--border-color)',
    borderRadius: 'var(--radius-lg)',
  }}>
    <FolderKanban size={40} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', display: 'block' }}/>
    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: cta ? 16 : 0 }}>{body}</div>
    {cta}
  </div>
);
