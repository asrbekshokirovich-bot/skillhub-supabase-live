import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { projectService } from '../lib/services/projectService';
import { userService } from '../lib/services/userService';
import { taskService } from '../lib/services/taskService';
import { triggerHaptic } from '../lib/haptics';

import NewTaskModal from '../components/NewTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskCompletionModal from '../components/TaskCompletionModal';

const Columns = ['To Do', 'In Progress', 'Done'];

const Discussions = ({ currentUser }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showNew, setShowNew] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [completingIssueId, setCompletingIssueId] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchProjectDetails();
    fetchIssues();
  }, [fetchUsers, fetchProjectDetails, fetchIssues]);

  const fetchProjectDetails = useCallback(async () => {
    try {
      const details = await projectService.getProject(projectId);
      setProjectDetails(details);
    } catch (err) {
      console.error("Error fetching project details:", err);
    }
  }, [projectId]);

  const fetchUsers = useCallback(async () => {
    try {
      const devs = await userService.getWorkers();
      setUsers(devs);
    } catch (err) {
      console.error("Error fetching devs:", err);
    }
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      let data = await taskService.getTasksByProject(projectId);
      
      const urgencyWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
      data.sort((a, b) => {
        const wA = urgencyWeight[a.urgency] || 0;
        const wB = urgencyWeight[b.urgency] || 0;
        return wB - wA;
      });

      setIssues(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const moveIssue = async (id, newStatus) => {
    if (newStatus === 'Done') {
      setCompletingIssueId(id);
      return;
    }
    try {
      await taskService.updateTask(projectId, id, { status: newStatus });
      triggerHaptic('medium');
      setIssues(issues.map(i => i.id === id ? { ...i, status: newStatus } : i));
    } catch (err) {
      console.error("Error updating task status:", err);
    }
  };

  const handleTaskCreated = (newTask) => {
    setIssues([newTask, ...issues]);
  };

  const handleTaskUpdated = (updatedTask) => {
    setIssues(issues.map(i => i.id === updatedTask.id ? updatedTask : i));
    if (selectedIssue && selectedIssue.id === updatedTask.id) {
      setSelectedIssue(updatedTask);
    }
  };

  const handleTaskCompleted = (taskId, screenshotUrl) => {
    setIssues(issues.map(i => i.id === taskId ? { ...i, status: 'Done', screenshotUrl } : i));
  };

  const projectName = projectDetails ? `Project Workspace: ${projectDetails.name}` : `Project Workspace: ${projectId ? projectId.toUpperCase() : 'N/A'}`;

  return (
    <div className="flex-col h-full gap-4 relative">
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
        {['ceo', 'worker'].includes(currentUser?.role) && (
          <button 
            className="btn btn-primary shadow-sm" 
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {showNew && (
        <NewTaskModal
          projectId={projectId}
          users={users}
          currentUser={currentUser}
          onClose={() => setShowNew(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* KANBAN BOARD */}
      <div className="kanban-board">
        {Columns.map((column, colIndex) => (
          <div key={column} className={`kanban-column animate-fade-in delay-${(colIndex + 1) * 100}`}>
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
        <TaskCompletionModal
          projectId={projectId}
          completingIssueId={completingIssueId}
          onClose={() => setCompletingIssueId(null)}
          onTaskCompleted={handleTaskCompleted}
        />
      )}

      {selectedIssue && (
        <TaskDetailModal
          issue={selectedIssue}
          projectId={projectId}
          users={users}
          currentUser={currentUser}
          projectDetails={projectDetails}
          onClose={() => setSelectedIssue(null)}
          onIssueUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
};

export default Discussions;
