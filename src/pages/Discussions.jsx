// ─────────────────────────────────────────────────────────────────────────
// Discussions (project workspace = kanban board).
//
// Drop-in replacement for src/pages/Discussions.jsx.
// Same Supabase queries, same drag-and-drop logic, same modal stack.
// Visual changes only:
//   • Cleaner project header with avatar, status, and date range
//   • Denser kanban columns with tighter type rhythm
//   • Status-coloured column dots so In Progress / Done are recognisable
//     at a glance
//   • Project description moved to the top of the page (collapsible) — it
//     was previously buried at the bottom and easy to miss
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Loader2, ArrowLeft, Settings, ChevronDown, ChevronRight,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useSystem } from '../components/SystemUI';
import { projectService } from '../lib/services/projectService';
import { userService } from '../lib/services/userService';
import { taskService } from '../lib/services/taskService';
import { triggerHaptic } from '../lib/haptics';
import { uuid } from '../lib/utils/ids';

import NewTaskModal from '../components/NewTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import ProjectFinancePanel from '../components/ProjectFinancePanel';
import KanbanTaskCard from '../components/KanbanTaskCard';

const Columns = [
  { id: 'To Do',       dot: 'var(--text-tertiary)' },
  { id: 'In Progress', dot: 'var(--accent-primary)' },
  { id: 'Done',        dot: 'var(--accent-success)' },
];

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
  const [descOpen, setDescOpen] = useState(true);

  const fetchProjectDetails = useCallback(async () => {
    try {
      const details = await projectService.getProject(projectId);
      setProjectDetails(details);
      if (onTitleChange && details?.name) onTitleChange(details.name);
    } catch (err) { console.error('Error fetching project details:', err); }
  }, [projectId, onTitleChange]);

  const fetchUsers = useCallback(async () => {
    try { const devs = await userService.getWorkers(); setUsers(devs); }
    catch (err) { console.error('Error fetching devs:', err); }
  }, []);

  const fetchIssues = useCallback(async () => {
    try {
      let data = await taskService.getTasksByProject(projectId);
      if (!data) data = [];
      const urgencyWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
      data.sort((a, b) => (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0));
      setIssues(data);
    } catch (err) { console.error('Error fetching tasks:', err); }
    finally { setLoading(false); }
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
      id: uuid(),
      text: `Task dragged from ${sourceStatus} to ${newStatus}${newStatus === 'Done' ? '. Pending Approval.' : ''}`,
      author: currentUser?.name || 'System',
      role: currentUser?.role || 'worker',
      timestamp: new Date().toISOString(),
      isSystem: true,
    };
    const updatedComments = [...(targetIssue?.comments || []), newComment];

    const updatePayload = { status: newStatus, comments: updatedComments };
    if (newStatus === 'Done') updatePayload.isApproved = false;

    setIssues(issues.map(i => i.id === draggableId ? { ...i, ...updatePayload } : i));

    try {
      await taskService.updateTask(projectId, draggableId, updatePayload);
      triggerHaptic('medium');
    } catch (err) {
      console.error('Error updating task status after drag:', err);
      setIssues(issues.map(i => i.id === draggableId ? targetIssue : i));
    }
  };

  const handleTaskCreated = (newTask) => setIssues([newTask, ...issues]);
  const handleTaskUpdated = (updatedTask) => {
    setIssues(issues.map(i => i.id === updatedTask.id ? updatedTask : i));
    if (selectedIssue && selectedIssue.id === updatedTask.id) setSelectedIssue(updatedTask);
  };

  const approveTask = async (task) => {
    const newComment = {
      id: uuid(),
      text: 'Task approved by CEO',
      author: currentUser?.name || 'System',
      role: currentUser?.role || 'ceo',
      timestamp: new Date().toISOString(),
      isSystem: true,
    };
    const updatedComments = [...(task.comments || []), newComment];
    const updatedTask = { ...task, isApproved: true, comments: updatedComments };
    setIssues(issues.map(i => i.id === task.id ? updatedTask : i));

    try {
      await taskService.updateTask(projectId, task.id, { isApproved: true, comments: updatedComments });
      toast.success('Task approved!');
      const updatedIssues = issues.map(i => i.id === task.id ? updatedTask : i);
      const allApproved = updatedIssues.every(i => i.status === 'Done' && i.isApproved === true);
      if (allApproved && updatedIssues.length > 0) {
        if (window.confirm('All tasks in this project are now done and approved. Mark the entire project as Done?')) {
          await projectService.updateProject(projectId, { status: 'Done' });
          toast.success('Project marked as Done!');
        }
      }
    } catch (err) {
      console.error('Error approving task:', err);
      toast.error('Failed to approve task');
      setIssues(issues.map(i => i.id === task.id ? task : i));
    }
  };

  const projectName = projectDetails?.name || 'Loading…';
  const clientLabel = projectDetails?.client || '';
  const statusLabel = projectDetails?.status || '';
  const totalTasks  = issues.length;
  const doneTasks   = issues.filter(i => i.status === 'Done').length;
  const progressPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusDot =
    statusLabel === 'Done'        ? 'var(--accent-success)' :
    statusLabel === 'In Progress' ? 'var(--accent-primary)' :
                                     'var(--text-tertiary)';

  return (
    <div className="custom-scrollbar"
      style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 4 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button onClick={() => navigate('/projects')} title="Back to projects"
            style={{
              width: 36, height: 36, padding: 0, borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
            <ArrowLeft size={16}/>
          </button>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
            background: 'var(--accent-primary-muted)', color: 'var(--accent-primary-text)',
            border: '1px solid var(--accent-primary-border)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.0625rem', fontWeight: 700,
          }}>{String(projectName).charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              margin: 0, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em',
              color: 'var(--text-primary)', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{projectName}</h2>
            <div style={{
              marginTop: 4, fontSize: '0.75rem', color: 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              {clientLabel && <span>{clientLabel}</span>}
              {clientLabel && statusLabel && <Sep/>}
              {statusLabel && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 8px', borderRadius: 999,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)', fontWeight: 600,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot }}/>
                  {statusLabel === 'Undone' ? 'Not started' : statusLabel}
                </span>
              )}
              {totalTasks > 0 && (
                <>
                  <Sep/>
                  <span>{doneTasks}/{totalTasks} tasks · {progressPct}%</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {currentUser?.role === 'ceo' && (
            <button className="btn btn-secondary" onClick={() => setShowSettings(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Settings size={14}/>Settings
            </button>
          )}
          {['ceo', 'worker'].includes(currentUser?.role) && (
            <button className="btn btn-primary" onClick={() => setShowNew(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14}/>New task
            </button>
          )}
        </div>
      </div>

      {/* PER-PROJECT FINANCE (CEO only) */}
      {currentUser?.role === 'ceo' && projectId && (
        <ProjectFinancePanel projectId={projectId} currentUser={currentUser}/>
      )}

      {/* PROJECT DESCRIPTION (collapsible, top instead of buried at the bottom) */}
      {projectDetails?.projectDescription && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', flexShrink: 0,
        }}>
          <button onClick={() => setDescOpen(o => !o)}
            style={{
              width: '100%', padding: '10px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'inherit', color: 'var(--text-secondary)',
              borderBottom: descOpen ? '1px solid var(--border-color)' : 'none',
            }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}>
              <span style={{ width: 3, height: 12, background: 'var(--accent-primary)', borderRadius: 2 }}/>
              Project description / phased plan
            </span>
            {descOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          </button>
          {descOpen && (
            <div style={{ padding: '14px 16px' }}>
              <div className="rich-text-content"
                style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{ __html: projectDetails.projectDescription }}/>
            </div>
          )}
        </div>
      )}

      {showSettings && projectDetails && (
        <ProjectSettingsModal
          project={projectDetails}
          onClose={() => setShowSettings(false)}
          onProjectUpdated={(updated) => setProjectDetails(updated)}
          onTasksGenerated={fetchIssues}
          onProjectDeleted={() => navigate('/projects')}
        />
      )}

      {showNew && (
        <NewTaskModal
          projectId={projectId}
          projectAssignee={projectDetails?.assignee}
          users={users} currentUser={currentUser}
          onClose={() => setShowNew(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}

      {/* KANBAN BOARD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board custom-scrollbar" style={{ flexShrink: 0 }}>
          {Columns.map((col) => {
            const colIssues = issues.filter(i => i.status === col.id);
            return (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      background: snapshot.isDraggingOver ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      border: `1px solid ${snapshot.isDraggingOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-lg)',
                      transition: 'background-color 0.15s, border-color 0.15s',
                      minHeight: 240,
                    }}>
                    <div style={{
                      padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border-color)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.dot, flexShrink: 0 }}/>
                        <span style={{
                          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                          color: 'var(--text-primary)',
                        }}>{col.id}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          {colIssues.length}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      flex: 1, padding: 10,
                      display: 'flex', flexDirection: 'column', gap: 8,
                      minHeight: 80,
                    }}>
                      {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center' }}>
                          <Loader2 className="animate-spin" size={16} style={{ color: 'var(--text-tertiary)' }}/>
                        </div>
                      ) : colIssues.length === 0 && !snapshot.isDraggingOver ? (
                        <div style={{
                          padding: '20px 16px', textAlign: 'center',
                          border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)',
                          color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 500,
                        }}>No tasks</div>
                      ) : (
                        colIssues.map((issue, issueIndex) => (
                          <Draggable key={issue.id} draggableId={issue.id} index={issueIndex}>
                            {(prov, snap) => (
                              <KanbanTaskCard
                                issue={issue} column={col.id}
                                users={users} currentUser={currentUser}
                                draggableProps={prov.draggableProps}
                                dragHandleProps={prov.dragHandleProps}
                                innerRef={prov.innerRef}
                                isDragging={snap.isDragging}
                                onOpen={() => setSelectedIssue(issue)}
                                onDelete={async () => {
                                  const ok = await showConfirm(
                                    'Are you sure you want to delete this task? This action cannot be undone.',
                                    'Delete task?'
                                  );
                                  if (!ok) return;
                                  try {
                                    await taskService.deleteTask(projectId, issue.id);
                                    toast.success('Task deleted.');
                                    setIssues(issues.filter(i => i.id !== issue.id));
                                  } catch (err) { toast.error('Failed to delete task.'); }
                                }}
                                onApprove={() => approveTask(issue)}
                              />
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

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

const Sep = () => <span style={{ color: 'var(--text-tertiary)' }}>·</span>;

export default Discussions;
