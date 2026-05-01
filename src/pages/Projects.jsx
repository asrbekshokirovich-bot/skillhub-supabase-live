import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, MoreVertical, Plus, Loader2, Users, Key, Settings, FileText } from 'lucide-react';
import { projectService } from '../lib/services/projectService';
import { userService } from '../lib/services/userService';
import ProjectVault from './ProjectVault';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import { useSystem } from '../components/SystemUI';
import DOMPurify from 'dompurify';

const formatToDateMask = (value) => {
  if (!value) return '';
  let val = value.replace(/\D/g, '');
  if (val.length > 8) val = val.substring(0, 8);
  
  if (val.length > 4) {
    return `${val.substring(0, 2)}/${val.substring(2, 4)}/${val.substring(4)}`;
  } else if (val.length > 2) {
    return `${val.substring(0, 2)}/${val.substring(2)}`;
  }
  return val;
};

const parseDDMMYYYYtoISO = (dateStr) => {
  if (!dateStr || dateStr.length !== 10) throw new Error("Invalid date length");
  const [dd, mm, yyyy] = dateStr.split('/');
  // Create Date using local timezone at exactly 00:00:00
  const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), 0, 0, 0);
  if (isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
};

export default function Projects({ currentUser }) {
  const { toast } = useSystem();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Project Form State
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startType, setStartType] = useState('now'); // 'now' or 'later'
  const [startDate, setStartDate] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [editingNotes, setEditingNotes] = useState({});

  const handleRichTextPaste = (e) => {
    e.preventDefault();
    let html = e.clipboardData.getData('text/html');
    let text = e.clipboardData.getData('text/plain');

    if (html) {
      const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'blockquote', 'span', 'div', 'h1', 'h2', 'h3'],
        ALLOWED_ATTR: ['href', 'target'],
        KEEP_CONTENT: true
      });
      document.execCommand('insertHTML', false, cleanHtml);
    } else if (text) {
      const cleanText = text.replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, cleanText);
    }
  };
  const [users, setUsers] = useState([]);

  // Reassign state
  const [reassignProjectId, setReassignProjectId] = useState(null);
  const [newAssignee, setNewAssignee] = useState('');

  // Vault state
  const [vaultProjectId, setVaultProjectId] = useState(null);
  const [vaultProjectName, setVaultProjectName] = useState('');

  // Settings state
  const [settingsProject, setSettingsProject] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const devs = await userService.getWorkers();
      setUsers(devs);
    } catch (err) {
      console.error("Error fetching devs:", err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      let data = [];
      const role = currentUser?.role;
      const name = currentUser?.name || '';

      if (role === 'ceo') {
        data = await projectService.getAllProjects();
      } else if (role === 'worker') {
        data = await projectService.getProjectsByAssignee(currentUser?.id);
      } else if (role === 'client') {
        data = await projectService.getProjectsByClient(name);
      } else {
        data = await projectService.getAllProjects();
      }
      

      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, [fetchUsers, fetchProjects]);

  const handleUpdateNotes = async (projectId, value) => {
    try {
      await projectService.updateProject(projectId, { clientNotes: value });
      setProjects(projects.map(p => p.id === projectId ? { ...p, clientNotes: value } : p));
    } catch (err) {
      toast.error("Failed to save notes");
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const isStartLater = startType === 'later';
      let parsedStartDate;
      
      if (isStartLater) {
        try {
          parsedStartDate = parseDDMMYYYYtoISO(startDate);
        } catch (e) {
          toast.error("Please enter a valid start date (DD/MM/YYYY).");
          setIsSubmitting(false);
          return;
        }
      } else {
        parsedStartDate = new Date().toISOString();
      }

      await projectService.createProject({
        name: projectName.trim(),
        client: clientName.trim(),
        status: isStartLater ? 'Undone' : 'In Progress',
        startDate: parsedStartDate,
        projectDescription: projectDescription,
        clientNotes: clientNotes,
        progress: 0,
        tasks: 0,
        assignee: assignee || 'Unassigned',
        createdBy: currentUser?.id
      });
      
      setProjectName('');
      setClientName('');
      setAssignee('');
      setStartType('now');
      setStartDate('');
      setProjectDescription('');
      setShowForm(false);
      fetchProjects(); // Refresh the list
    } catch (err) {
      console.error("Error creating project:", err);
      toast.error('Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignProjectId) return;
    try {
      await projectService.updateProject(reassignProjectId, {
        assignee: newAssignee || 'Unassigned'
      });
      
      setReassignProjectId(null);
      setNewAssignee('');
      fetchProjects();
    } catch (err) {
      console.error('Error reassigning:', err);
      toast.error('Failed to reassign project');
    }
  };

  return (
    <>
    <div className="flex-col gap-8 h-full w-full">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-1">Projects Overview</h2>
          <p className="text-secondary text-base">Overview of all ongoing and completed projects.</p>
        </div>
        {currentUser?.role === 'ceo' && (
          <button 
            className="btn btn-primary flex items-center gap-2 shadow-sm"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem' }}
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {showForm && (
        <div className="card animate-fade-in mb-8" style={{ padding: '2rem' }}>
          <h3 className="text-xl font-bold mb-6">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="flex-col gap-6">
            <div className="flex gap-6 w-full flex-wrap">
              <div className="flex-col gap-2 flex-1" style={{ minWidth: '250px' }}>
                <label className="text-sm font-bold">Project Name</label>
                <input 
                  type="text" 
                  className="input w-full" 
                  placeholder="e.g. Website Redesign"
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-col gap-2 flex-1" style={{ minWidth: '250px' }}>
                <label className="text-sm font-bold">Client Name</label>
                <input 
                  type="text" 
                  className="input w-full" 
                  placeholder="e.g. Acme Corp"
                  style={{ padding: '0.75rem', fontSize: '1rem' }}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-6 w-full mt-2">
              <div className="flex-col gap-2 w-full">
                <label className="text-sm font-bold">Assigned Worker</label>
                <select 
                  value={assignee} 
                  onChange={(e) => setAssignee(e.target.value)} 
                  className="input w-full" 
                  style={{ appearance: 'auto', outline: 'none', padding: '0.75rem', fontSize: '1rem' }}
                >
                  <option value="">Unassigned</option>
                  {users.map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-col gap-3 mt-2">
              <label className="text-sm font-bold">Project Start</label>
              <div className="flex gap-4 mt-1 w-full">
                <button
                  type="button"
                  onClick={() => setStartType('now')}
                  className="flex-1 flex items-center justify-center transition-all duration-200 hover-elevate"
                  style={{
                    padding: '0.875rem',
                    borderRadius: '8px',
                    border: startType === 'now' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                    backgroundColor: startType === 'now' ? 'var(--bg-secondary)' : 'transparent',
                    color: startType === 'now' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}
                >
                  Start Now
                </button>
                <button
                  type="button"
                  onClick={() => setStartType('later')}
                  className="flex-1 flex items-center justify-center transition-all duration-200 hover-elevate"
                  style={{
                    padding: '0.875rem',
                    borderRadius: '8px',
                    border: startType === 'later' ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)',
                    backgroundColor: startType === 'later' ? 'var(--bg-secondary)' : 'transparent',
                    color: startType === 'later' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}
                >
                  Plan for Later
                </button>
              </div>
              {startType === 'later' && (
                <div className="mt-2 animate-fade-in">
                  <input 
                    type="text" 
                    className="input w-full"
                    placeholder="DD/MM/YYYY"
                    value={startDate}
                    onChange={(e) => setStartDate(formatToDateMask(e.target.value))}
                    style={{ padding: '0.75rem', fontSize: '1rem', letterSpacing: '0.05em' }}
                    required={startType === 'later'}
                    maxLength={10}
                  />
                </div>
              )}
            </div>

            <div className="flex-col gap-2 mt-4">
              <label className="text-sm font-bold">Client Notes (Initial Meeting)</label>
              <textarea 
                className="input w-full custom-scrollbar"
                placeholder="Jot down raw notes here during your initial client call..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                style={{ padding: '1rem', fontSize: '0.95rem', minHeight: '100px', backgroundColor: 'var(--bg-secondary)', resize: 'vertical' }}
              />
            </div>

            <div className="flex-col gap-2 mt-4">
              <label className="text-sm font-bold">Project Description (Phased Plan)</label>
              <div style={{ position: 'relative' }}>
                <div 
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none',
                    fontSize: '15px',
                    display: !projectDescription.trim() ? 'block' : 'none'
                  }}
                >
                  Write the phased plan and project details here...
                </div>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setProjectDescription(e.currentTarget.innerHTML)}
                  onInput={e => {
                    const isEmp = !e.currentTarget.textContent.trim();
                    const ph = e.currentTarget.previousElementSibling;
                    if (ph) ph.style.display = isEmp ? 'block' : 'none';
                  }}
                  onPaste={handleRichTextPaste}
                  className="w-full text-[15px] leading-[1.6] transition-colors overflow-y-auto rich-text-editor custom-scrollbar cursor-text"
                  style={{ 
                    whiteSpace: 'normal', 
                    wordBreak: 'break-word', 
                    minHeight: '160px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    padding: '16px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-[var(--border-color)]">
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem' }}
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary flex items-center gap-2"
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.95rem' }}
                disabled={isSubmitting || !projectName || !clientName}
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-col gap-6">
        {loading ? (
          <div className="flex justify-center p-16"><Loader2 className="animate-spin text-secondary" size={40} /></div>
        ) : projects.length === 0 ? (
          <div className="card flex flex-col items-center justify-center w-full" style={{ padding: '6rem 2rem', textAlign: 'center', backgroundColor: 'transparent', border: '2px dashed var(--border-color)' }}>
            <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
              <FolderKanban size={56} className="text-tertiary mb-4" />
              <h3 className="text-2xl font-bold mb-2">No Active Projects</h3>
              <p className="text-secondary text-base mb-6">Create a new project workspace to get started.</p>
              {currentUser?.role === 'ceo' && (
                <button 
                  className="btn btn-primary flex items-center justify-center gap-2 mt-2 mx-auto"
                  style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={20} /> Create Your First Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {projects.map((project, index) => (
              <div key={project.id} className={`card hover-elevate animate-slide-up delay-${((index % 5) + 1) * 100}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', width: '100%', minHeight: '260px' }}>
                <div className="flex justify-between items-start mb-4 w-full">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <FolderKanban size={24} className="text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', lineHeight: '1.2', color: 'var(--text-primary)', letterSpacing: '-0.01em', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{project.client}</span>
                    </div>
                  </div>
                  {currentUser?.role === 'ceo' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSettingsProject(project); }}
                      className="hover-elevate transition-colors flex items-center justify-center"
                      style={{ 
                        padding: '8px', 
                        borderRadius: '8px', 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)'
                      }}
                      title="Project Settings"
                    >
                      <Settings size={18} />
                    </button>
                  )}
                </div>

                {project.status === 'Undone' && project.startDate && new Date(project.startDate) <= new Date() ? (
                  <div className="flex-col gap-2 mb-4 p-3" style={{ backgroundColor: 'var(--alert-error-bg)', border: '1px solid var(--alert-error-border)', borderRadius: '8px' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--alert-error-text)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--alert-error-text)' }}>Pending Start Approval</span>
                    </div>
                    {currentUser?.role === 'ceo' && (
                      <div className="flex gap-2 mt-1">
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', flex: 1, backgroundColor: 'var(--alert-error-text)', color: '#fff', border: 'none' }}
                          onClick={async () => {
                            await projectService.updateProject(project.id, { status: 'In Progress' });
                            fetchProjects();
                          }}
                        >
                          Approve Start
                        </button>
                      </div>
                    )}
                  </div>
                ) : project.status === 'Undone' && project.startDate && new Date(project.startDate) > new Date() ? (
                  <div className="flex items-center gap-2 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Starts {new Date(project.startDate).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-4" style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: project.status === 'Done' ? 'var(--accent-success)' : project.status === 'In Progress' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>{project.status === 'Undone' ? 'Not Started' : project.status}</span>
                  </div>
                )}

                {project.assignee && project.assignee !== 'Unassigned' ? (
                  <div className="flex items-center gap-2 mb-4">
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                      {String(users.find(u => u.id === project.assignee)?.name || project.assignee).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: '1' }}>Lead</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600', lineHeight: '1' }}>
                        {users.find(u => u.id === project.assignee)?.name || project.assignee}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-4 opacity-50">
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'transparent', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={12} className="text-tertiary" />
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: '500' }}>Unassigned</span>
                  </div>
                )}

                <div className="flex-col gap-2 mt-auto flex-1 justify-end pb-4">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Progress</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>{project.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${project.progress}%`, 
                      height: '100%', 
                      backgroundColor: project.progress === 100 ? 'var(--accent-success)' : 'var(--text-primary)', 
                      borderRadius: '999px',
                      transition: 'width 1s ease-in-out' 
                    }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem', fontWeight: '500' }}>{project.tasks || 0} active tasks</p>
                </div>

                <div className="flex mt-2 w-full gap-2 pt-2">
                  <button 
                    className="btn hover-elevate flex-1"
                    style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    Workspace
                  </button>
                  {currentUser?.role === 'ceo' && (
                    <button
                      className="btn hover-elevate flex-1"
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: '600', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                      onClick={() => {
                        setReassignProjectId(project.id);
                        setNewAssignee(project.assignee === 'Unassigned' ? '' : project.assignee);
                      }}
                    >
                      Reassign
                    </button>
                  )}
                  {(currentUser?.role === 'ceo' || currentUser?.role === 'worker') && (
                    <button
                      className="btn hover-elevate flex items-center justify-center gap-2"
                      style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
                      onClick={() => {
                        setVaultProjectName(project.name);
                        setVaultProjectId(project.id);
                      }}
                      title="Project Vault"
                    >
                      <Key size={16} />
                    </button>
                  )}
                  {currentUser?.role === 'ceo' && (
                    <button
                      className={`btn hover-elevate flex items-center justify-center gap-2 ${expandedNotes[project.id] ? 'active' : ''}`}
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: expandedNotes[project.id] ? 'var(--accent-primary)' : 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)', 
                        color: expandedNotes[project.id] ? '#fff' : 'var(--text-primary)', 
                        borderRadius: '6px' 
                      }}
                      onClick={() => {
                        setExpandedNotes(prev => ({ ...prev, [project.id]: !prev[project.id] }));
                        if (!editingNotes[project.id] && project.clientNotes) {
                          setEditingNotes(prev => ({ ...prev, [project.id]: project.clientNotes }));
                        }
                      }}
                      title="Client Notes"
                    >
                      <FileText size={16} />
                    </button>
                  )}
                </div>
                
                {expandedNotes[project.id] && currentUser?.role === 'ceo' && (
                  <div className="mt-3 animate-fade-in">
                    <textarea
                      className="input w-full custom-scrollbar"
                      placeholder="Jot down notes from the client..."
                      value={editingNotes[project.id] !== undefined ? editingNotes[project.id] : (project.clientNotes || '')}
                      onChange={(e) => setEditingNotes(prev => ({ ...prev, [project.id]: e.target.value }))}
                      onBlur={(e) => handleUpdateNotes(project.id, e.target.value)}
                      style={{ 
                        padding: '0.8rem', 
                        fontSize: '0.9rem', 
                        minHeight: '120px', 
                        backgroundColor: 'var(--bg-primary)', 
                        border: '1px solid var(--border-color)',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

      {reassignProjectId && (
        <div
          onClick={() => setReassignProjectId(null)}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}
        >
          <div
            className="card animate-fade-in"
            style={{ padding: '1.5rem', minWidth: '320px', maxWidth: '420px', width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">Reassign Worker</h3>
            <p className="text-sm text-secondary mb-4">Select a new lead worker for this project.</p>
            <select
              value={newAssignee}
              onChange={e => setNewAssignee(e.target.value)}
              className="input w-full mb-4"
              style={{ appearance: 'auto' }}
            >
                <option value="">Unassigned</option>
              {users.map(dev => (
                <option key={dev.id} value={dev.id}>{dev.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setReassignProjectId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReassign}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Vault Modal */}
      {vaultProjectId && (currentUser?.role === 'ceo' || currentUser?.role === 'worker') && (
        <ProjectVault 
          projectId={vaultProjectId} 
          projectName={vaultProjectName} 
          onClose={() => {
            setVaultProjectId(null);
            setVaultProjectName('');
          }} 
        />
      )}

      {settingsProject && (
        <ProjectSettingsModal
          project={settingsProject}
          onClose={() => setSettingsProject(null)}
          onProjectUpdated={(updatedProject) => {
            setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
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
