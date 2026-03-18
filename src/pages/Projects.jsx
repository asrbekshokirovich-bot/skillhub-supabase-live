import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, MoreVertical, Plus, Loader2, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, addDoc, where, updateDoc, doc } from 'firebase/firestore';

const Projects = ({ currentUser }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Project Form State
  const [showForm, setShowForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);

  // Reassign state
  const [reassignProjectId, setReassignProjectId] = useState(null);
  const [newAssignee, setNewAssignee] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'profiles'), where('role', '==', 'developer'));
      const snap = await getDocs(q);
      const devs = [];
      snap.forEach(d => devs.push({ id: d.id, ...d.data() }));
      setUsers(devs);
    } catch (err) {
      console.error("Error fetching devs:", err);
    }
  };

  const fetchProjects = async () => {
    try {
      let q;
      if (currentUser?.role === 'admin') {
        q = query(collection(db, 'projects'));
      } else if (currentUser?.role === 'developer') {
        q = query(collection(db, 'projects'), where('assignee', '==', currentUser?.name || ''));
      } else if (currentUser?.role === 'client') {
        q = query(collection(db, 'projects'), where('client', '==', currentUser?.name || ''));
      } else {
        q = query(collection(db, 'projects'));
      }

      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Sort in JavaScript to avoid Firestore composite index requirements
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: projectName.trim(),
        client: clientName.trim(),
        status: 'In Progress',
        progress: 0,
        tasks: 0,
        assignee: assignee || 'Unassigned',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Unknown'
      });
      
      setProjectName('');
      setClientName('');
      setAssignee('');
      setShowForm(false);
      fetchProjects(); // Refresh the list
    } catch (err) {
      console.error("Error creating project:", err);
      alert("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!reassignProjectId) return;
    try {
      await updateDoc(doc(db, 'projects', reassignProjectId), {
        assignee: newAssignee || 'Unassigned'
      });
      setReassignProjectId(null);
      setNewAssignee('');
      fetchProjects();
    } catch (err) {
      console.error('Error reassigning:', err);
      alert('Failed to reassign project');
    }
  };

  return (
    <div className="flex-col gap-6 h-full w-full max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Active Projects</h2>
          <p className="text-secondary">Overview of all ongoing and completed projects.</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {showForm && (
        <div className="card animate-fade-in mb-6" style={{ padding: '1.5rem' }}>
          <h3 className="text-lg font-bold mb-4">Create New Project</h3>
          <form onSubmit={handleCreateProject} className="flex-col gap-4">
            <div className="flex gap-4 w-full">
              <div className="flex-col gap-1.5 flex-1">
                <label className="text-sm font-bold">Project Name</label>
                <input 
                  type="text" 
                  className="input w-full" 
                  placeholder="e.g. Website Redesign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-col gap-1.5 flex-1">
                <label className="text-sm font-bold">Client Name</label>
                <input 
                  type="text" 
                  className="input w-full" 
                  placeholder="e.g. Acme Corp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-4 w-full mt-2">
              <div className="flex-col gap-1.5 w-full">
                <label className="text-sm font-bold">Assigned Developer</label>
                <select 
                  value={assignee} 
                  onChange={(e) => setAssignee(e.target.value)} 
                  className="input w-full" 
                  style={{ appearance: 'auto', outline: 'none' }}
                >
                  <option value="">Unassigned</option>
                  {users.map(dev => (
                    <option key={dev.id} value={dev.name}>{dev.name} ({dev.username})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary flex items-center gap-2"
                disabled={isSubmitting || !projectName || !clientName}
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex-col gap-4">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-secondary" size={32} /></div>
        ) : projects.length === 0 ? (
          <div className="card flex items-center justify-center" style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'transparent', border: '1px dashed var(--border-color)' }}>
            <div className="flex-col items-center gap-2">
              <FolderKanban size={48} className="text-secondary mb-2" />
              <h3 className="text-lg font-bold">No Active Projects</h3>
              <p className="text-secondary text-sm">Create a new project workspace to get started.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {projects.map((project, index) => (
              <div key={project.id} className={`card hover-elevate animate-slide-up delay-${(index + 1) * 100}`} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="flex justify-between items-start mb-4 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center justify-center" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <FolderKanban size={20} className="text-primary" />
                    </div>
                    <div className="flex-col gap-1">
                      <h3 className="text-lg font-bold leading-tight">{project.name}</h3>
                      <span className="text-sm text-secondary">Client: {project.client}</span>
                    </div>
                  </div>
                  <div className="flex-col items-end gap-2">
                    <span className="badge" style={{ 
                      backgroundColor: project.status === 'Done' ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      whiteSpace: 'nowrap'
                    }}>{project.status}</span>
                  </div>
                </div>

                {project.assignee && project.assignee !== 'Unassigned' && (
                  <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: '1px dashed var(--border-color)' }}>
                    <Users size={14} className="text-secondary" />
                    <span className="text-xs text-secondary">Lead Developer: <span className="font-medium text-[var(--text-primary)]">{project.assignee}</span></span>
                  </div>
                )}

                <div className="flex-col gap-3 mt-2 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-secondary">Progress</span>
                    <span className="font-bold">{project.progress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${project.progress}%`, height: '100%', backgroundColor: 'var(--text-primary)', transition: 'width 1s ease-in-out' }}></div>
                  </div>
                  <p className="text-xs text-secondary mt-1">{project.tasks || 0} total tasks tracked</p>
                </div>

                <div className="flex-col mt-6 w-full animate-fade-in delay-300 gap-2">
                   <button 
                     className="btn btn-primary w-full shadow-sm"
                     onClick={() => navigate(`/projects/${project.id}`)}
                   >
                     Open Workspace
                   </button>
                   {currentUser?.role === 'admin' && (
                     <button
                       className="btn btn-secondary w-full"
                       onClick={() => {
                         setReassignProjectId(project.id);
                         setNewAssignee(project.assignee === 'Unassigned' ? '' : project.assignee);
                       }}
                     >
                       Reassign Developer
                     </button>
                   )}
                </div>
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
            <h3 className="text-lg font-bold mb-1">Reassign Developer</h3>
            <p className="text-sm text-secondary mb-4">Select a new lead developer for this project.</p>
            <select
              value={newAssignee}
              onChange={e => setNewAssignee(e.target.value)}
              className="input w-full mb-4"
              style={{ appearance: 'auto' }}
            >
              <option value="">Unassigned</option>
              {users.map(dev => (
                <option key={dev.id} value={dev.name}>{dev.name} ({dev.username})</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button className="btn btn-secondary" onClick={() => setReassignProjectId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReassign}>Save</button>
            </div>
          </div>
        </div>
      )}
  );
};

export default Projects;
