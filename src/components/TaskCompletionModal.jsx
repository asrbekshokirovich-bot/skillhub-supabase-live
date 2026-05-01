import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { storageService } from '../lib/services/storageService';
import { taskService } from '../lib/services/taskService';
import { useSystem } from './SystemUI';

const TaskCompletionModal = ({ projectId, completingIssue, issues, currentUser, onClose, onTaskCompleted }) => {
  const { toast } = useSystem();
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const completeTaskWithScreenshot = async (e) => {
    e.preventDefault();
    if (!screenshotFile || !completingIssue) return;

    setIsUploading(true);
    try {
      const fileExt = screenshotFile.name.split('.').pop();
      const path = `projects/${projectId}/tasks/${completingIssue.id}/screenshot_${Date.now()}.${fileExt}`;
      const url = await storageService.uploadFile(path, screenshotFile);

      const targetIssue = issues.find(i => i.id === completingIssue.id);
      const newComment = {
        id: Date.now().toString(),
        text: `Task dragged from ${completingIssue.sourceStatus} to Done. Pending Approval.`,
        author: currentUser?.name || 'System',
        role: currentUser?.role || 'worker',
        timestamp: new Date().toISOString(),
        isSystem: true
      };
      const updatedComments = [...(targetIssue?.comments || []), newComment];

      await taskService.updateTask(projectId, completingIssue.id, { 
        status: 'Done', 
        screenshotUrl: url,
        isApproved: false,
        comments: updatedComments
      });
      onTaskCompleted({ ...targetIssue, status: 'Done', screenshotUrl: url, isApproved: false, comments: updatedComments });
      onClose();
    } catch (err) {
      console.error("Error uploading screenshot:", err);
      toast.error('Failed to save screenshot. Try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
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
            <button type="button" className="btn btn-secondary px-4 py-2" disabled={isUploading} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary px-4 py-2 flex items-center gap-2" disabled={isUploading || !screenshotFile}>
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : 'Upload & Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default TaskCompletionModal;
