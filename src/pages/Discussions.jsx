import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, MessageSquare, ArrowLeft, ArrowRight, Loader2, Check, CheckSquare, Trash2 } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, query, orderBy, getDocs, addDoc, doc, updateDoc, where, getDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const initialIssues = [];

const Columns = ['To Do', 'In Progress', 'Done'];

const Discussions = ({ currentUser }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('Feature');
  const [newUrgency, setNewUrgency] = useState('Medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newScreenshotFile, setNewScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);

  // Detail Modal State
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activePopover, setActivePopover] = useState(null);
  const [activeTab, setActiveTab] = useState('Activity');

  // Completion Modal State
  const [completingIssueId, setCompletingIssueId] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Mid-task Screenshot Upload State
  const [isUploadingMidTask, setIsUploadingMidTask] = useState(false);

  // Comments State
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchProjectDetails();
    fetchIssues();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProjectDetails(docSnap.data());
      }
    } catch (err) {
      console.error("Error fetching project details:", err);
    }
  };

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

  const fetchIssues = async () => {
    try {
      const q = query(collection(db, 'projects', projectId, 'tasks'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => {
        const docData = d.data();
        data.push({ 
          id: d.id, 
          ...docData,
          timeTracked: docData.timeTracked || 0,
          timeEstimated: docData.timeEstimated || 0,
          startDate: docData.startDate || null,
          dueDate: docData.dueDate || null,
          tags: docData.tags || [],
          watchers: docData.watchers || [],
          dependencies: docData.dependencies || [],
          checklists: docData.checklists || []
        });
      });
      setIssues(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const moveIssue = async (id, newStatus) => {
    if (newStatus === 'Done') {
      setCompletingIssueId(id);
      return;
    }
    try {
      await updateDoc(doc(db, 'projects', projectId, 'tasks', id), { status: newStatus });
      setIssues(issues.map(i => i.id === id ? { ...i, status: newStatus } : i));
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const updateTaskField = async (field, value) => {
    if (!selectedIssue) return;
    try {
      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), { [field]: value });
      const updatedIssue = { ...selectedIssue, [field]: value };
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === selectedIssue.id ? updatedIssue : i));
    } catch (err) {
      console.error(`Error updating task field ${field}:`, err);
    }
  };

  const completeTaskWithScreenshot = async (e) => {
    e.preventDefault();
    if (!screenshotFile || !completingIssueId) return;

    setIsUploading(true);
    try {
      const fileExt = screenshotFile.name.split('.').pop();
      const storageRef = ref(storage, `projects/${projectId}/tasks/${completingIssueId}/screenshot_${Date.now()}.${fileExt}`);
      await uploadBytes(storageRef, screenshotFile);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'projects', projectId, 'tasks', completingIssueId), { 
        status: 'Done',
        screenshotUrl: url
      });

      setIssues(issues.map(i => i.id === completingIssueId ? { ...i, status: 'Done', screenshotUrl: url } : i));
      
      setCompletingIssueId(null);
      setScreenshotFile(null);
    } catch (err) {
      console.error("Error uploading screenshot:", err);
      alert("Failed to save screenshot. Please ensure Firebase Storage rules allow writing.");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMidTaskScreenshot = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedIssue) return;

    setIsUploadingMidTask(true);
    try {
      const fileExt = file.name.split('.').pop();
      const storageRef = ref(storage, `projects/${projectId}/tasks/${selectedIssue.id}/screenshot_mid_${Date.now()}.${fileExt}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), { 
        screenshotUrl: url
      });

      const updatedIssue = { ...selectedIssue, screenshotUrl: url };
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === selectedIssue.id ? updatedIssue : i));
    } catch (err) {
      console.error("Error uploading mid-task screenshot:", err);
      alert("Failed to upload screenshot.");
    } finally {
      setIsUploadingMidTask(false);
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedIssue) return;
    
    setIsCommenting(true);
    try {
      const newComment = {
        id: Date.now().toString(),
        text: newCommentText.trim(),
        author: currentUser?.name || 'Unknown',
        createdAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), {
        comments: arrayUnion(newComment)
      });
      
      const updatedIssue = {
        ...selectedIssue,
        comments: [...(selectedIssue.comments || []), newComment]
      };
      
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
      setNewCommentText('');
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to post comment.");
    } finally {
      setIsCommenting(false);
    }
  };

  const addSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim() || !selectedIssue) return;
    
    try {
      const newSubtask = {
        id: Date.now().toString(),
        text: newSubtaskText.trim(),
        completed: false
      };
      
      const updatedSubtasks = [...(selectedIssue.subtasks || []), newSubtask];
      
      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), {
        subtasks: updatedSubtasks
      });
      
      const updatedIssue = { ...selectedIssue, subtasks: updatedSubtasks };
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
      setNewSubtaskText('');
    } catch (err) {
      console.error("Error adding subtask:", err);
    }
  };

  const toggleSubtask = async (subtaskId) => {
    if (!selectedIssue) return;
    
    try {
      const updatedSubtasks = (selectedIssue.subtasks || []).map(st => 
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      
      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), {
        subtasks: updatedSubtasks
      });
      
      const updatedIssue = { ...selectedIssue, subtasks: updatedSubtasks };
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    } catch (err) {
      console.error("Error toggling subtask:", err);
    }
  };

  const updateSubtaskText = async (subtaskId, newText) => {
    if (!selectedIssue || !newText.trim()) return;
    try {
      const updatedSubtasks = (selectedIssue.subtasks || []).map(st => 
        st.id === subtaskId ? { ...st, text: newText.trim() } : st
      );
      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), {
        subtasks: updatedSubtasks
      });
      const updatedIssue = { ...selectedIssue, subtasks: updatedSubtasks };
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    } catch (err) {
      console.error("Error updating subtask text:", err);
    }
  };

  const deleteSubtask = async (subtaskId) => {
    if (!selectedIssue) return;
    
    try {
      const updatedSubtasks = (selectedIssue.subtasks || []).filter(st => st.id !== subtaskId);
      
      await updateDoc(doc(db, 'projects', projectId, 'tasks', selectedIssue.id), {
        subtasks: updatedSubtasks
      });
      
      const updatedIssue = { ...selectedIssue, subtasks: updatedSubtasks };
      setSelectedIssue(updatedIssue);
      setIssues(issues.map(i => i.id === updatedIssue.id ? updatedIssue : i));
    } catch (err) {
      console.error("Error deleting subtask:", err);
    }
  };

  const addIssue = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    
    setIsSubmitting(true);
    try {
      let url = null;
      if (newScreenshotFile) {
        const fileExt = newScreenshotFile.name.split('.').pop();
        const storageRef = ref(storage, `projects/${projectId}/tasks/new/screenshot_${Date.now()}.${fileExt}`);
        await uploadBytes(storageRef, newScreenshotFile);
        url = await getDownloadURL(storageRef);
      }

      const newTask = {
        title: newTitle,
        description: newDescription,
        type: newType,
        status: 'To Do',
        author: currentUser?.name || 'Unknown User',
        urgency: newUrgency,
        assignee: newAssignee || 'Unassigned',
        screenshotUrl: url,
        subtasks: [],
        timeTracked: 0,
        timeEstimated: 0,
        startDate: null,
        dueDate: null,
        tags: [],
        watchers: [currentUser?.name || 'Unknown User'],
        dependencies: [],
        checklists: [],
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'projects', projectId, 'tasks'), newTask);
      
      setNewTitle('');
      setNewDescription('');
      setNewType('Feature');
      setNewUrgency('Medium');
      setNewAssignee('');
      setNewScreenshotFile(null);
      setShowNew(false);
      fetchIssues();
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectName = projectDetails ? `Project Workspace: ${projectDetails.name}` : `Project Workspace: ${projectId ? projectId.toUpperCase() : 'N/A'}`;

  return (
    <div className="flex-col h-full gap-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-4 items-center">
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">{projectName}</h2>
            <p className="text-secondary text-sm">Kanban board for tasks, bugs, and features</p>
          </div>
        </div>
        {['admin', 'developer'].includes(currentUser?.role) && (
          <button 
            className="btn btn-primary shadow-sm" 
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {showNew && (
        <div className="card hover-elevate animate-fade-in" style={{ backgroundColor: 'var(--bg-secondary)', marginBottom: '1.5rem', width: '100%', maxWidth: '800px' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <h3 className="card-title">Create New Issue</h3>
          </div>
          <form onSubmit={addIssue}>
            <div className="card-body flex-col gap-4">
              <div className="flex-col gap-2">
                <label className="text-sm font-bold">Issue Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  placeholder="Short, descriptive title..." 
                  className="w-full" 
                  style={{ padding: '0.75rem' }} 
                  autoFocus
                  required
                />
              </div>

              <div className="flex-col gap-2">
                <label className="text-sm font-bold">Details (Optional)</label>
                <textarea 
                  value={newDescription} 
                  onChange={(e) => setNewDescription(e.target.value)} 
                  placeholder="Detailed explanation, steps to reproduce, or acceptance criteria..." 
                  className="w-full" 
                  rows="3"
                  style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', resize: 'vertical' }} 
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-col gap-2 flex-1">
                  <label className="text-sm font-bold">Type</label>
                  <select 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value)} 
                    className="w-full" 
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    <option>Feature</option>
                    <option>Bug</option>
                    <option>Task</option>
                  </select>
                </div>
                <div className="flex-col gap-2 flex-1">
                  <label className="text-sm font-bold">Urgency</label>
                  <select 
                    value={newUrgency} 
                    onChange={(e) => setNewUrgency(e.target.value)} 
                    className="w-full" 
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
              </div>

              <div className="flex-col gap-2 mt-2">
                <label className="text-sm font-bold">Attach Screenshot (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setNewScreenshotFile(e.target.files[0])}
                  className="w-full text-sm p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] rounded-md cursor-pointer"
                />
              </div>

              <div className="flex gap-4 mt-2">
                <div className="flex-col gap-2 flex-1">
                  <label className="text-sm font-bold">Assignee</label>
                  <select 
                    value={newAssignee} 
                    onChange={(e) => setNewAssignee(e.target.value)} 
                    className="w-full" 
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}
                  >
                    <option value="">Unassigned</option>
                    {users.map(dev => (
                      <option key={dev.id} value={dev.name}>{dev.name} ({dev.username})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={() => setShowNew(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isSubmitting || !newTitle}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Task'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-6 h-full items-start overflow-x-auto pb-4">
        {Columns.map((column, colIndex) => (
          <div key={column} className={`flex-col gap-4 bg-secondary animate-fade-in delay-${(colIndex + 1) * 100}`} style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', minHeight: '500px', width: '400px', flexShrink: 0 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">{column}</h3>
              <span className="badge">{issues.filter(i => i.status === column).length}</span>
            </div>
            
            <div className="flex-col gap-3">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
              ) : issues.filter(i => i.status === column).length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  No tasks in this column
                </div>
              ) : (
                issues.filter(i => i.status === column).map((issue, issueIndex) => (
                  <div 
                    key={issue.id} 
                    className={`card hover-elevate animate-slide-up delay-${(issueIndex + 1) * 100} cursor-pointer`} 
                    style={{ backgroundColor: 'var(--bg-primary)', padding: '1.25rem' }}
                    onClick={() => setSelectedIssue(issue)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="badge" style={{ 
                        backgroundColor: issue.type === 'Bug' ? '#fee2e2' : 'var(--bg-tertiary)',
                        color: issue.type === 'Bug' ? '#dc2626' : 'var(--text-primary)',
                        border: issue.type === 'Bug' ? '1px solid #f87171' : '1px solid var(--border-color)'
                      }}>
                        {issue.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm leading-snug mb-2">{issue.title}</h4>
                    {issue.subtasks && issue.subtasks.length > 0 && (
                      <div className="mb-2 w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-[var(--accent-primary)] h-full transition-all duration-300" 
                          style={{ width: `${(issue.subtasks.filter(st => st.completed).length / issue.subtasks.length) * 100}%` }}
                        />
                      </div>
                    )}
                    {issue.description && (
                      <p className="text-xs text-secondary mb-3 line-clamp-3" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {issue.description}
                      </p>
                    )}
                    {issue.screenshotUrl && (
                      <div className="mb-3 rounded-md overflow-hidden border border-[var(--border-color)]">
                        <img src={issue.screenshotUrl} alt="Completion Proof" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>
                    )}
                    {issue.assignee && issue.assignee !== 'Unassigned' && (
                      <p className="text-xs text-secondary mb-4 bg-secondary inline-block px-2 py-1 rounded-md">
                        Assignee: <span className="font-medium">{issue.assignee}</span>
                      </p>
                    )}
                    
                    <div className="flex justify-between items-center mt-auto pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <div className="flex items-center gap-2">
                         <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
                           {issue.author.charAt(0)}
                         </div>
                         <span className="text-xs text-secondary">{issue.author}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 p-1">
                          <MessageSquare size={14} className="text-secondary" />
                          <span className="text-xs text-secondary font-medium">{issue.comments?.length || 0}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {column !== 'To Do' && (
                            <button 
                              className="btn btn-secondary flex items-center justify-center hover-elevate transition-all" 
                              style={{ padding: '0.35rem' }}
                              onClick={(e) => { e.stopPropagation(); moveIssue(issue.id, Columns[colIndex - 1]); }}
                              title="Move left"
                            >
                              <ArrowLeft size={14} />
                            </button>
                          )}
                          {column !== 'Done' && (
                            <button 
                              className="btn btn-secondary flex items-center justify-center hover-elevate transition-all" 
                              style={{ padding: '0.35rem' }}
                              onClick={(e) => { e.stopPropagation(); moveIssue(issue.id, Columns[colIndex + 1]); }}
                              title="Move right"
                            >
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {completingIssueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
          <div className="card shadow-xl w-full animate-slide-up" style={{ maxWidth: '450px', backgroundColor: 'var(--bg-primary)', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <h3 className="text-xl font-bold mb-2">Complete Task</h3>
            <p className="text-sm text-secondary mb-5">Please upload a screenshot to prove this task is complete before moving it to Done.</p>
            <form onSubmit={completeTaskWithScreenshot} className="flex-col gap-4">
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setScreenshotFile(e.target.files[0])}
                className="w-full text-sm p-4 mb-4 font-medium"
                style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-color)', cursor: 'pointer' }}
                required
              />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn btn-secondary px-4 py-2" disabled={isUploading} onClick={() => { setCompletingIssueId(null); setScreenshotFile(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary px-4 py-2 flex items-center gap-2" disabled={isUploading || !screenshotFile}>
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : 'Upload & Complete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {selectedIssue && (
        <div className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }} onClick={() => setSelectedIssue(null)}>
          <div className="relative flex shadow-2xl w-[95vw] max-w-[1100px]" style={{ maxHeight: '90vh', backgroundColor: '#000000', border: '1px solid #333333', borderRadius: '12px', padding: '0', gap: '0', color: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden' }} onClick={e => e.stopPropagation()}>

            {/* ─── LEFT: main content ─────────────────────────────── */}
            <div className="flex flex-col h-full overflow-y-auto flex-1" style={{ padding: '24px 24px 0 24px', gap: '18px', scrollbarColor: '#1E293B transparent' }}>

              {/* Cover banner */}
              <div className="w-full relative group rounded-lg overflow-hidden flex items-center justify-end shrink-0" style={{ height: selectedIssue?.coverUrl ? '120px' : '28px', marginTop: '-4px' }}>
                {selectedIssue?.coverUrl ? (
                  <img src={selectedIssue.coverUrl} className="w-full h-full object-cover absolute inset-0" alt="Cover" />
                ) : (
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium text-[#666666] hover:text-white hover:bg-zinc-800/50">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Add Cover
                  </button>
                )}
              </div>

              {/* FIX #4 — Breadcrumb uses only real data */}
              <div className="flex items-center text-[12px] font-medium shrink-0" style={{ color: '#888888' }}>
                <span className="hover:text-white cursor-pointer transition-colors">{projectDetails?.name || 'Project'}</span>
                <span className="mx-1.5 text-[#334155]">/</span>
                <span className="text-[#94A3B8] font-semibold truncate max-w-[280px]">{selectedIssue.title}</span>
              </div>

              {/* Title row — #1 stronger weight + size */}
              <div className="flex items-start justify-between w-full shrink-0" style={{ gap: '12px', marginBottom: '14px' }}>
                {editingField === 'title' ? (
                  <input
                    autoFocus
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={() => { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (editValue.trim() !== selectedIssue.title) updateTaskField('title', editValue.trim()); setEditingField(null); } }}
                    className="font-[700] tracking-[-0.025em] outline-none flex-1"
                    style={{ fontSize: '28px', lineHeight: '1.25', backgroundColor: 'transparent', color: '#FFFFFF', border: 'none', borderBottom: '2px solid #FFFFFF', paddingBottom: '2px' }}
                  />
                ) : (
                  <h1
                    className="font-[700] tracking-[-0.025em] text-white hover:bg-[#222222] px-1 -ml-1 rounded cursor-pointer transition-colors flex-1"
                    style={{ fontSize: '28px', lineHeight: '1.25' }}
                    onClick={() => { setEditingField('title'); setEditValue(selectedIssue.title || ''); }}
                  >
                    {selectedIssue.title}
                  </h1>
                )}
                <button className="shrink-0 mt-2 p-1.5 hover:bg-[#222222] rounded transition-colors text-[#888888] hover:text-[#94A3B8]" onClick={e => { e.stopPropagation(); setSelectedIssue(null); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Metadata — #2 label opacity + #3 consistent 8px row spacing */}
              <div className="flex flex-col shrink-0 border-b border-[#333333] pb-5" style={{ gap: '0px' }}>

                {/* Status — #8 reduced badge visual weight, #9 normalized icon 14px */}
                <div className="flex items-center" style={{ minHeight: '32px' }}>
                  <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
                    </div>
                    <span className="text-[12px] font-[500] text-[#888888]">Status</span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div
                      onClick={() => setActivePopover(activePopover === 'status' ? null : 'status')}
                      className="flex items-center cursor-pointer font-[600] tracking-wider select-none hover:opacity-80 transition-opacity"
                      style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.06em',
                        backgroundColor: '#000000',
                        color: '#FFFFFF',
                        border: '1px solid #555555'
                      }}
                    >
                      {selectedIssue.status.toUpperCase()}
                    </div>
                    {activePopover === 'status' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-44 rounded-lg shadow-xl py-1 overflow-hidden" style={{ backgroundColor: '#000000', border: '1px solid #333333' }}>
                        {[['To Do','#52525B'],['In Progress','#60A5FA'],['Done','#34D399']].map(([s,c]) => (
                          <div key={s} onClick={() => { updateTaskField('status', s); setActivePopover(null); }} className="px-3 py-2 text-[13px] text-[#CCCCCC] hover:bg-[#222222] cursor-pointer flex items-center gap-2.5">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', backgroundColor: c }}/>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignee — #9 icon 14px */}
                <div className="flex items-center" style={{ minHeight: '32px' }}>
                  <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <span className="text-[12px] font-[500] text-[#888888]">Assignee</span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div onClick={() => setActivePopover(activePopover === 'assignee' ? null : 'assignee')} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#222222]/60 px-2 py-1 rounded transition-colors -ml-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#7C3AED' }}>
                        {selectedIssue.assignee !== 'Unassigned' ? selectedIssue.assignee.charAt(0) : '?'}
                      </div>
                      <span className="text-[13px] text-[#CCCCCC] font-[500]">{selectedIssue.assignee}</span>
                    </div>
                    {activePopover === 'assignee' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-56 rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto" style={{ backgroundColor: '#000000', border: '1px solid #333333' }}>
                        <div onClick={() => { updateTaskField('assignee', 'Unassigned'); setActivePopover(null); }} className="px-3 py-2 text-[13px] text-[#94A3B8] hover:bg-[#222222] cursor-pointer">Unassigned</div>
                        {users.map(u => (<div key={u.id} onClick={() => { updateTaskField('assignee', u.name); setActivePopover(null); }} className="px-3 py-2 text-[13px] text-[#E5E7EB] hover:bg-[#222222] cursor-pointer">{u.name}</div>))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority — #9 icon 14px */}
                <div className="flex items-center" style={{ minHeight: '32px' }}>
                  <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg>
                    </div>
                    <span className="text-[12px] font-[500] text-[#888888]">Priority</span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div onClick={() => setActivePopover(activePopover === 'priority' ? null : 'priority')} className="flex items-center gap-1.5 cursor-pointer hover:bg-[#222222]/60 px-2 py-1 rounded transition-colors -ml-2">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', backgroundColor: (selectedIssue.priority||'Medium')==='Urgent'?'#EF4444':(selectedIssue.priority||'Medium')==='High'?'#F97316':(selectedIssue.priority||'Medium')==='Medium'?'#EAB308':'#71717A' }}/>
                      <span className="text-[13px] text-[#CCCCCC] font-[500]">{selectedIssue.priority || 'Medium'}</span>
                    </div>
                    {activePopover === 'priority' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-36 rounded-lg shadow-xl py-1" style={{ backgroundColor: '#000000', border: '1px solid #333333' }}>
                        {[['Urgent','#EF4444'],['High','#F97316'],['Medium','#EAB308'],['Low','#71717A']].map(([p,c])=>(
                          <div key={p} onClick={()=>{updateTaskField('priority',p);setActivePopover(null);}} className="px-3 py-2 text-[13px] text-[#E5E7EB] hover:bg-[#222222] cursor-pointer flex items-center gap-2">
                            <span style={{width:7,height:7,borderRadius:'50%',display:'inline-block',backgroundColor:c}}/>{p}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates — #9 icon 14px */}
                <div className="flex items-center" style={{ minHeight: '32px' }}>
                  <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                    <span className="text-[12px] font-[500] text-[#888888]">Dates</span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')} className="flex items-center gap-1 cursor-pointer hover:bg-[#222222]/60 px-2 py-1 rounded transition-colors -ml-2">
                      <span className="text-[13px] text-[#CCCCCC] font-[500] whitespace-nowrap">
                        {selectedIssue.startDate ? new Date(selectedIssue.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}&nbsp;→&nbsp;{selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                      </span>
                    </div>
                    {activePopover === 'dates' && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-60 rounded-lg shadow-xl p-3 flex flex-col gap-3" style={{ backgroundColor: '#000000', border: '1px solid #333333' }}>
                        <div><label className="text-[11px] text-[#64748B] uppercase tracking-wider mb-1 block">Start Date</label><input type="date" value={selectedIssue.startDate||''} onChange={e=>updateTaskField('startDate',e.target.value)} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none" style={{backgroundColor:'#1E293B',borderColor:'#334155',color:'#E5E7EB',colorScheme:'dark'}}/></div>
                        <div><label className="text-[11px] text-[#64748B] uppercase tracking-wider mb-1 block">Due Date</label><input type="date" value={selectedIssue.dueDate||''} onChange={e=>updateTaskField('dueDate',e.target.value)} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none" style={{backgroundColor:'#1E293B',borderColor:'#334155',color:'#E5E7EB',colorScheme:'dark'}}/></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time estimate — #9 icon 14px */}
                <div className="flex items-center" style={{ minHeight: '32px' }}>
                  <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <span className="text-[12px] font-[500] text-[#888888]">Time estimate</span>
                  </div>
                  <div className="flex-1 flex items-center">
                    {editingField === 'time' ? (
                      <input autoFocus type="text" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{updateTaskField('timeEstimated',editValue.trim());setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="rounded px-2 text-[13px] text-[#E5E7EB] outline-none w-24 border border-indigo-500" style={{backgroundColor:'#1E293B',height:'26px'}}/>
                    ) : (
                      <div onClick={()=>{setEditingField('time');setEditValue(selectedIssue.timeEstimated||'');}} className="flex items-center cursor-pointer hover:bg-[#222222]/60 px-2 py-1 rounded transition-colors text-[13px] font-[500] -ml-2">
                        {selectedIssue.timeEstimated ? <span className="text-[#CCCCCC]">{selectedIssue.timeEstimated}</span> : <span className="text-[#334155] italic">Not set</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags — #9 icon 14px */}
                <div className="flex items-center" style={{ minHeight: '32px' }}>
                  <div className="flex items-center shrink-0" style={{ width: '120px' }}>
                    <div className="w-[20px] shrink-0 flex justify-center mr-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    </div>
                    <span className="text-[12px] font-[500] text-[#888888]">Tags</span>
                  </div>
                  <div className="relative flex flex-1 items-center">
                    <div onClick={()=>setActivePopover(activePopover==='tags'?null:'tags')} className="flex items-center gap-1 cursor-pointer hover:bg-[#222222]/60 px-2 py-1 rounded transition-colors flex-wrap -ml-2">
                      {(selectedIssue.tags||[]).length>0 ? selectedIssue.tags.map(t=>(
                        <span key={t} className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{backgroundColor:'#1E1B4B',color:'#A5B4FC'}}>{t}</span>
                      )) : <span className="text-[13px] text-[#334155] italic">Add tags</span>}
                    </div>
                    {activePopover==='tags'&&(
                      <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-64 rounded-lg shadow-xl p-3" style={{backgroundColor:'#0D1117',border:'1px solid #1E293B'}}>
                        <label className="text-[11px] text-[#64748B] uppercase tracking-wider mb-2 block">Tags — comma separated</label>
                        <input autoFocus type="text" defaultValue={(selectedIssue.tags||[]).join(', ')} onKeyDown={e=>{if(e.key==='Enter'){const tags=e.target.value.split(',').map(t=>t.trim()).filter(Boolean);updateTaskField('tags',tags);setActivePopover(null);}}} className="w-full border rounded px-2 py-1.5 text-[13px] outline-none" style={{backgroundColor:'#1E293B',borderColor:'#334155',color:'#E5E7EB'}} placeholder="bug, ui, high-priority"/>
                        <div className="text-[11px] text-[#888888] mt-1.5">↵ Enter to save</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* #6 AI banner — tertiary / lower emphasis */}
                <div className="w-fit flex items-center gap-2 cursor-pointer mt-4 opacity-80 hover:opacity-100 transition-opacity" style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #2D3748'}}>
                  <span className="text-[14px]">✨</span>
                  <span className="text-[12px] font-medium text-white">Ask Brain to summarize, generate subtasks or find similar milestones</span>
                </div>

              </div>

              {/* Description — #4 border contrast + focus ring, #5 button hierarchy */}
              {/* Description — Seamless text area */}
              <div className="flex flex-col shrink-0" style={{ gap: '8px' }}>
                <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#888888]">Description</h3>
                <div className="w-full relative flex flex-col group transition-all duration-200 focus-within:ring-0" style={{minHeight:'90px',backgroundColor:'#0A0A0A',borderRadius:'8px',padding:'12px 14px',border:`1px solid ${editingField==='description'?'#FFFFFF':'#333333'}`,boxShadow:editingField==='description'?'0 0 0 3px rgba(255, 255, 255, 0.15)':''}} onMouseEnter={e=>{if(editingField!=='description')e.currentTarget.style.borderColor='#666666'}} onMouseLeave={e=>{if(editingField!=='description')e.currentTarget.style.borderColor='#333333'}}>
                  <textarea 
                    value={editValue !== undefined && editingField === 'description' ? editValue : (selectedIssue.description || '')} 
                    onFocus={() => { setEditingField('description'); setEditValue(selectedIssue.description || ''); }}
                    onChange={e => setEditValue(e.target.value)} 
                    onBlur={() => { if(editValue !== undefined && editValue !== selectedIssue.description) updateTaskField('description', editValue); setEditingField(null); }}
                    className="w-full h-full min-h-[68px] text-[14px] leading-[1.65] outline-none resize-none focus:ring-0 focus:outline-none border-0" 
                    style={{backgroundColor:'transparent',color:'#FFFFFF',border:'none',outline:'none',boxShadow:'none',padding:0,resize:'none'}} 
                    placeholder="Click to start writing details..."
                  />
                </div>
              </div>

              {/* Subtasks — #7 header gap 8px, brighter placeholder, aligned checkbox */}
              <div className="flex flex-col shrink-0" style={{ gap: '8px' }}>
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#888888]">Subtasks</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{backgroundColor:'#161B25',color:'#3D4F63',border:'1px solid #1E293B'}}>
                    {selectedIssue.subtasks?.filter(st=>st.completed).length||0}/{selectedIssue.subtasks?.length||0}
                  </span>
                </div>
                <div className="flex flex-col rounded-lg overflow-hidden" style={{backgroundColor:'#0D111A',border:'1px solid #263040'}}>
                  {selectedIssue.subtasks && selectedIssue.subtasks.map(st => (
                    <div key={st.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-[#222222] group transition-colors border-b border-[#333333] last:border-b-0" style={{minHeight:'36px'}}>
                      <div className="flex items-center gap-3 flex-1">
                        <button
                          onClick={()=>toggleSubtask(st.id)}
                          className="shrink-0 flex items-center justify-center rounded transition-all duration-150"
                          style={{width:16,height:16,borderRadius:'3px',backgroundColor:st.completed?'#FFFFFF':'transparent',border:`1.5px solid ${st.completed?'#FFFFFF':'#555555'}`}}
                        >
                          {st.completed && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </button>
                        {editingField===`subtask-${st.id}` ? (
                          <input autoFocus type="text" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={()=>{if(editValue.trim()!==st.text)updateSubtaskText(st.id,editValue);setEditingField(null);}} onKeyDown={e=>{if(e.key==='Enter')e.target.blur();}} className="outline-none flex-1 text-[13px]" style={{backgroundColor:'transparent',color:'#F1F5F9',border:'none',borderBottom:'1px solid #6366f1'}}/>
                        ) : (
                          <span onClick={()=>{setEditingField(`subtask-${st.id}`);setEditValue(st.text);}} className={`flex-1 text-[13px] leading-snug cursor-text select-none ${st.completed?'line-through text-[#555555]':'text-[#CCCCCC] hover:text-white'}`}>{st.text}</span>
                        )}
                      </div>
                      <button onClick={e=>{e.stopPropagation();deleteSubtask(st.id);}} className="w-5 h-5 opacity-0 group-hover:opacity-100 rounded hover:bg-red-500/15 text-[#888888] hover:text-red-400 flex items-center justify-center transition-all ml-2">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center px-3 py-1.5 hover:bg-[#1A2236]/50 transition-colors focus-within:bg-[#222222]" style={{minHeight:'36px'}}>
                    <div className="w-[18px] flex justify-center shrink-0 mr-2.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                    <form onSubmit={addSubtask} className="flex-1 flex items-center gap-2">
                      <input type="text" value={newSubtaskText} onChange={e=>setNewSubtaskText(e.target.value)} placeholder="Add a subtask..." className="flex-1 text-[13px] outline-none font-medium placeholder-[#64748B]" style={{backgroundColor:'transparent',color:'#CBD5E1',border:'none'}} />
                      {newSubtaskText.trim() && <span className="text-[11px] text-[#888888] shrink-0 font-medium">↵ add</span>}
                    </form>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="flex flex-col shrink-0 pb-6" style={{ gap: '8px' }}>
                <h3 className="text-[11px] font-[700] uppercase tracking-widest text-[#888888]">Attachments</h3>
                {selectedIssue.screenshotUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-[#0B0F17]">
                    <img src={selectedIssue.screenshotUrl} alt="Task Proof" className="w-full h-auto max-h-[320px] object-contain"/>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="bg-zinc-800 hover:bg-zinc-700 text-white text-[13px] font-medium px-4 py-2 rounded cursor-pointer transition-colors flex items-center gap-2 border border-zinc-700">
                        {isUploadingMidTask?<Loader2 size="14" className="animate-spin"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
                        Update Screenshot
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadMidTaskScreenshot} disabled={isUploadingMidTask}/>
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#333333] hover:border-zinc-600 hover:bg-zinc-800/20 transition-all w-full rounded-lg flex flex-col items-center justify-center cursor-pointer" style={{height:'88px'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" className="mb-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[13px] font-medium text-[#666666]">Upload Screenshot</span>
                    <span className="text-[11px] text-[#444444] mt-0.5">PNG, JPG, GIF</span>
                    <input type="file" accept="image/*" style={{display:'none'}} onChange={uploadMidTaskScreenshot} disabled={isUploadingMidTask}/>
                  </label>
                )}
              </div>

            </div> {/* end left */}

            {/* RIGHT SIDEBAR — #7 background contrast + increased internal padding */}
            <div className="flex flex-col shrink-0" style={{width:'290px',backgroundColor:'#060910',borderLeft:'1px solid #1A2436',overflow:'hidden'}}>

              {/* Tabs — #7 more padding */}
              <div className="px-4 py-3.5 border-b border-[#333333]">
                <div className="flex items-center gap-0.5 p-1 rounded-lg border border-[#333333]" style={{backgroundColor:'#0B0F18'}}>
                  {['Activity','Comments','Notes'].map(tab=>(
                    <button key={tab} onClick={()=>setActiveTab(tab)} className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md transition-colors ${activeTab===tab?'bg-[#333333] text-white shadow-sm':'text-[#666666] hover:text-[#888888]'}`}>{tab}</button>
                  ))}
                </div>
              </div>

              {activeTab==='Notes' ? (
                <div className="flex flex-col flex-1 gap-2.5 p-4 overflow-hidden">
                  <p className="text-[11px] text-[#666666]">Internal notes — not visible to the client.</p>
                  <textarea value={selectedIssue.notes||''} onChange={e=>updateTaskField('notes',e.target.value)} placeholder="Type internal notes... (auto-saves)" className="flex-1 w-full border border-[#333333] rounded-lg p-3 text-[13px] outline-none resize-none focus:border-white/50 transition-colors" style={{backgroundColor:'#0B0F18',color:'#CBD5E1',caretColor:'#6366f1'}} />
                </div>
              ) : (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Feed — #7 increased padding */}
                  <div className="px-4 py-3 border-b border-[#333333] flex items-center justify-between bg-black shrink-0">
                    <h3 className="text-[12px] font-[600] text-white tracking-wide">Activity feed</h3>
                  </div>
                  {/* Feed — #7 increased padding */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 bg-black" style={{scrollbarColor:'#1A2436 transparent', boxShadow:'inset 0px 4px 6px -6px rgba(0,0,0,0.5)'}}>

                    {/* Creation */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-[#222222] flex items-center justify-center text-[11px] text-white shrink-0 font-semibold">{selectedIssue.author.charAt(0)}</div>
                      <div className="flex-1 mt-0.5">
                        <div className="text-[13px] text-white"><span className="font-semibold text-white">{selectedIssue.author}</span> created this task</div>
                        <div className="text-[12px] text-[#888888] mt-1">{new Date(selectedIssue.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                      </div>
                    </div>

                    {(selectedIssue.comments||[]).map(c=>(
                      <div key={c.id} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-[#222222] flex items-center justify-center text-[11px] text-white shrink-0 font-semibold">{c.author.charAt(0)}</div>
                        <div className="flex-1 mt-0.5">
                          <div className="text-[13px] text-white"><span className="font-semibold text-white">{c.author}</span></div>
                          <div className="text-[12px] text-[#888888] mt-1 mb-2">{new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                          <div className="text-[13px] text-white px-3 py-2.5 rounded-lg border border-[#333333] bg-[#0A0A0A] whitespace-pre-wrap leading-[1.6] shadow-sm">{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comment box */}
                  <div className="p-4 border-t border-[#333333] shrink-0 bg-black">
                    <form onSubmit={addComment} className="flex flex-col rounded-lg border border-[#333333] bg-[#0A0A0A] overflow-hidden focus-within:border-[#555555] transition-colors">
                      <textarea
                        value={newCommentText}
                        onChange={e=>setNewCommentText(e.target.value)}
                        className="w-full px-3 py-3 text-[13px] outline-none font-sans"
                        style={{backgroundColor:'transparent',color:'#fff',border:'none',minHeight:'64px',resize:'none',boxShadow:'none'}}
                        placeholder="Write a comment..."
                        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(newCommentText.trim()&&!isCommenting)addComment(e);}}}
                      />
                      <div className="flex items-center justify-end px-3 py-2 bg-[#111111] border-t border-[#222222]">
                        <button type="submit" disabled={isCommenting||!newCommentText.trim()} className={`p-1.5 rounded transition-colors ${newCommentText.trim()?'bg-white text-black hover:bg-gray-200':'text-[#444444] cursor-not-allowed'}`}>
                          {isCommenting?<Loader2 size="14" className="animate-spin"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Discussions;
