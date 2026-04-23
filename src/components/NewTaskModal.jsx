import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { taskService } from '../lib/services/taskService';
import { storageService } from '../lib/services/storageService';

const NewTaskModal = ({ projectId, users, currentUser, onClose, onTaskCreated }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('Feature');
  const [newUrgency, setNewUrgency] = useState('Medium');
  const [newAssignee, setNewAssignee] = useState('');
  const [newScreenshotFile, setNewScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addIssue = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    
    setIsSubmitting(true);
    try {
      let url = null;
      if (newScreenshotFile) {
        const fileExt = newScreenshotFile.name.split('.').pop();
        const path = `projects/${projectId}/tasks/new/screenshot_${Date.now()}.${fileExt}`;
        url = await storageService.uploadFile(path, newScreenshotFile);
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
        checklists: []
      };
      
      const createdTask = await taskService.createTask(projectId, newTask);
      onTaskCreated(createdTask);
      onClose();
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to create task: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card hover-elevate animate-fade-in" style={{ backgroundColor: 'var(--bg-secondary)', marginBottom: '1.5rem', width: '100%', maxWidth: '800px' }}>
      <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <h3 className="card-title">Create New Task</h3>
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
          
          <div className="flex gap-4 flex-wrap">
            <div className="flex-col gap-2 flex-1" style={{ minWidth: '150px' }}>
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
            <div className="flex-col gap-2 flex-1" style={{ minWidth: '150px' }}>
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
                  <option key={dev.id} value={dev.name}>{dev.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn btn-secondary" disabled={isSubmitting} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={isSubmitting || !newTitle}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
export default NewTaskModal;
