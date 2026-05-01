import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Loader2, CheckSquare, ArrowLeft, Settings, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSystem } from '../components/SystemUI';
import { projectService } from '../lib/services/projectService';
import { userService } from '../lib/services/userService';
import { taskService } from '../lib/services/taskService';
import { triggerHaptic } from '../lib/haptics';

import NewTaskModal from '../components/NewTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
};


const Columns = ['To Do', 'In Progress', 'Done'];

const Discussions = ({ currentUser, onTitleChange }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast, showConfirm } = useSystem();
  
  const [issues, setIssues] = useState([]);
  const [users, setUsers] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showNew, setShowNew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const fetchProjectDetails = useCallback(async () => {
    try {
      const details = await projectService.getProject(projectId);
      setProjectDetails(details);
      // SYSTEM RULE: Dynamic page title is pushed to the layout header.
      // The header always shows the specific project name, never a generic string.
      if (onTitleChange && details?.name) onTitleChange(details.name);
    } catch (err) {
      console.error('Error fetching project details:', err);
    }
  }, [projectId, onTitleChange]);

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
      if (!data) data = [];
      
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

  useEffect(() => {
    fetchUsers();
    fetchProjectDetails();
    fetchIssues();
  }, [fetchUsers, fetchProjectDetails, fetchIssues]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const newStatus = destination.droppableId;
    const sourceStatus = source.droppableId;
    
    const targetIssue = issues.find(i => i.id === draggableId);
    const newComment = {
      id: Date.now().toString(),
      text: `Task dragged from ${sourceStatus} to ${newStatus}${newStatus === 'Done' ? '. Pending Approval.' : ''}`,
      author: currentUser?.name || 'System',
      role: currentUser?.role || 'worker',
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    const updatedComments = [...(targetIssue?.comments || []), newComment];
    
    const updatePayload = { status: newStatus, comments: updatedComments };
    if (newStatus === 'Done') updatePayload.isApproved = false;

    // Optimistically update
    setIssues(issues.map(i => i.id === draggableId ? { ...i, ...updatePayload } : i));
    
    try {
      await taskService.updateTask(projectId, draggableId, updatePayload);
      triggerHaptic('medium');
    } catch (err) {
      console.error("Error updating task status after drag:", err);
      // Revert optimistic update
      setIssues(issues.map(i => i.id === draggableId ? targetIssue : i));
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

  const approveTask = async (task) => {
    const newComment = {
      id: Date.now().toString(),
      text: `Task approved by CEO`,
      author: currentUser?.name || 'System',
      role: currentUser?.role || 'ceo',
      timestamp: new Date().toISOString(),
      isSystem: true
    };
    const updatedComments = [...(task.comments || []), newComment];
    const updatedTask = { ...task, isApproved: true, comments: updatedComments };
    
    // Optimistic update
    setIssues(issues.map(i => i.id === task.id ? updatedTask : i));
    
    try {
      await taskService.updateTask(projectId, task.id, { isApproved: true, comments: updatedComments });
      toast.success('Task approved!');
      
      // Check if all tasks are now Done and Approved
      const updatedIssues = issues.map(i => i.id === task.id ? updatedTask : i);
      const allApproved = updatedIssues.every(i => i.status === 'Done' && i.isApproved === true);
      
      if (allApproved && updatedIssues.length > 0) {
        if (window.confirm("All tasks in this project are now done and approved. Mark the entire project as Done?")) {
          await projectService.updateProject(projectId, { status: 'Done' });
          toast.success('Project marked as Done!');
        }
      }
    } catch (err) {
      console.error("Error approving task:", err);
      toast.error('Failed to approve task');
      // Revert optimistic
      setIssues(issues.map(i => i.id === task.id ? task : i));
    }
  };

  const projectName = projectDetails ? `Project Workspace: ${projectDetails.name}` : `Project Workspace: ${projectId ? projectId.toUpperCase() : 'N/A'}`;

  return (
    <div className="flex-col gap-4 relative custom-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', paddingRight: '4px' }}>
      <div className="flex justify-between items-center mb-2" style={{ flexShrink: 0 }}>
        <div className="flex gap-4 items-center">
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold">{projectName}</h2>
            <p className="text-secondary text-sm">Kanban board for tasks, bugs, and features</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {currentUser?.role === 'ceo' && (
            <button 
              className="btn btn-secondary shadow-sm flex items-center gap-2" 
              onClick={() => setShowSettings(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Settings size={16} /> Settings
            </button>
          )}
          {['ceo', 'worker'].includes(currentUser?.role) && (
            <button 
              className="btn btn-primary shadow-sm flex items-center gap-2" 
              onClick={() => setShowNew(true)}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>


      {showSettings && projectDetails && (
        <ProjectSettingsModal
          project={projectDetails}
          onClose={() => setShowSettings(false)}
          onProjectUpdated={(updated) => setProjectDetails(updated)}
          onTasksGenerated={fetchIssues}
          onProjectDeleted={(projectId) => {
            navigate('/projects');
          }}
        />
      )}

      {showNew && (
        <NewTaskModal
          projectId={projectId}
          projectAssignee={projectDetails?.assignee}
          users={users}
          currentUser={currentUser}
          onClose={() => setShowNew(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* KANBAN BOARD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board custom-scrollbar" style={{ flexShrink: 0 }}>
          {Columns.map((column, colIndex) => (
            <Droppable droppableId={column} key={column}>
              {(provided, snapshot) => (
                <div 
                  className="kanban-column"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'var(--bg-secondary)'
                  }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">{column}</h3>
                    <span className="badge">{issues.filter(i => i.status === column).length}</span>
                  </div>
                  
                  <div className="flex-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {loading ? (
                      <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
                    ) : issues.filter(i => i.status === column).length === 0 && !snapshot.isDraggingOver ? (
                      <div 
                        className="flex items-center justify-center border border-dashed border-[var(--border-color)] rounded-lg" 
                        style={{ height: '80px', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}
                      >
                        No tasks in this column
                      </div>
                    ) : (
                      issues.filter(i => i.status === column).map((issue, issueIndex) => (
                        <Draggable key={issue.id} draggableId={issue.id} index={issueIndex}>
                          {(provided, snapshot) => (
                            <div 
                              className="card hover-elevate cursor-pointer" 
                              style={{ 
                                ...provided.draggableProps.style,
                                display: 'flex', flexDirection: 'column',
                                backgroundColor: 'var(--bg-primary)',
                                flexShrink: 0,
                                opacity: snapshot.isDragging ? 0.9 : 1,
                                boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                              }}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedIssue(issue)}
                            >
                              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex flex-wrap items-center" style={{ gap: '6px' }}>
                                    {column === 'Done' && issue.isApproved === false && (
                                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '0.02em', flexShrink: 0, backgroundColor: 'var(--accent-warning-muted)', color: 'var(--accent-warning-text)' }}>
                                        Pending Approval
                                      </span>
                                    )}
                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em', flexShrink: 0, 
                                      backgroundColor: issue.urgency === 'High' ? 'var(--alert-error-bg)' : issue.urgency === 'Medium' ? 'var(--accent-warning-muted)' : 'var(--accent-success-muted)', 
                                      color: issue.urgency === 'High' ? 'var(--alert-error-text)' : issue.urgency === 'Medium' ? 'var(--accent-warning-text)' : 'var(--accent-success-text)' 
                                    }}>
                                      {issue.urgency || 'Medium'}
                                    </span>
                                    {issue.tags && issue.tags.slice(0, 2).map((tag, tagIndex) => (
                                      <span key={tagIndex} style={{ fontSize: '10px', padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderRadius: '4px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                        {tag}
                                      </span>
                                    ))}
                                    {issue.tags && issue.tags.length > 2 && (
                                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '600' }}>+{issue.tags.length - 2}</span>
                                    )}
                                  </div>
                                  
                                  {currentUser?.role === 'ceo' && (
                                    <button 
                                      className="p-1.5 rounded-md transition-all shrink-0 ml-2"
                                      style={{ color: '#ef4444', opacity: 0.6 }}
                                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const confirmed = await showConfirm('Are you sure you want to delete this task? This action cannot be undone.', 'Delete Task?');
                                        if (confirmed) {
                                          try {
                                            await taskService.deleteTask(projectId, issue.id);
                                            toast.success('Task deleted successfully.');
                                            setIssues(issues.filter(i => i.id !== issue.id));
                                          } catch (err) {
                                            toast.error('Failed to delete task.');
                                          }
                                        }
                                      }}
                                      title="Delete Task"
                                    >
                                      <Trash2 size={16} strokeWidth={2.5} />
                                    </button>
                                  )}
                                </div>
                                
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', lineHeight: '1.4', wordBreak: 'break-word', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                                  {issue.title}
                                </h4>
                                
                                {issue.description && stripHtml(issue.description) && (
                                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: '0 0 0.75rem 0', wordBreak: 'break-word', lineHeight: '1.5' }}>
                                    {stripHtml(issue.description)}
                                  </p>
                                )}
                                
                                {issue.screenshotUrl && (
                                  <div style={{ margin: '0 0 0.75rem 0', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: '100px', backgroundColor: 'var(--bg-secondary)' }}>
                                    <img src={issue.screenshotUrl} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  </div>
                                )}
                                {column === 'Done' && issue.isApproved === false && currentUser?.role === 'ceo' && (
                                  <button 
                                    className="btn btn-primary w-full mt-2 mb-2" 
                                    style={{ padding: '0.5rem', fontSize: '0.85rem', backgroundColor: 'var(--accent-success)', border: 'none', color: '#fff' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      approveTask(issue);
                                    }}
                                  >
                                    Approve Task
                                  </button>
                                )}
                              </div>
                              
                              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
                                <div className="flex items-center gap-2">
                                   {(() => {
                                     const assigneeName = (issue.assignee && issue.assignee !== 'Unassigned')
                                       ? (users.find(u => u.id === issue.assignee)?.name || issue.assignee)
                                       : null;
                                     return (
                                       <div className="flex items-center gap-2" title={assigneeName || 'Unassigned'}>
                                         <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: assigneeName ? 'var(--accent-primary-muted)' : 'var(--bg-tertiary)', color: assigneeName ? 'var(--accent-primary-text)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', flexShrink: 0, border: assigneeName ? '1px solid var(--accent-primary-border)' : '1px solid var(--border-color)' }}>
                                           {String(assigneeName || '?').charAt(0)}
                                         </div>
                                         <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                           {String(assigneeName || 'Unassigned').split(' ')[0]}
                                         </span>
                                       </div>
                                     );
                                   })()}
                                </div>
                                
                                <div className="flex items-center" style={{ gap: '12px' }}>
                                  {Array.isArray(issue.subtasks) && issue.subtasks.length > 0 && (
                                    <div className="flex items-center" style={{ gap: '4px', color: 'var(--text-secondary)' }} title="Subtasks">
                                      <CheckSquare size={14} strokeWidth={2.5} />
                                      <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                                        {issue.subtasks.filter(st => st?.completed).length}/{issue.subtasks.length}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center" style={{ gap: '4px' }} title="Comments">
                                    <MessageSquare size={14} strokeWidth={2.5} style={{ color: 'var(--text-secondary)' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{Array.isArray(issue.comments) ? issue.comments.length : 0}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {projectDetails?.projectDescription && (
        <div className="card mt-2 mb-8" style={{ padding: '16px 20px', borderLeft: '4px solid var(--accent-primary)', backgroundColor: 'var(--bg-secondary)', flexShrink: 0 }}>
          <h4 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Project Description / Phased Plan</h4>
          <div 
            className="rich-text-content" 
            style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: projectDetails.projectDescription }}
          />
        </div>
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
          onIssueDeleted={(taskId) => {
            setIssues(issues.filter(i => i.id !== taskId));
            setSelectedIssue(null);
          }}
        />
      )}
    </div>
  );
};

export default Discussions;
