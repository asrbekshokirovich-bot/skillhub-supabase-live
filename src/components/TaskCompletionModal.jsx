// ─────────────────────────────────────────────────────────────────────────
// TaskCompletionModal — upload proof-of-completion screenshot.
// Drop-in replacement. Same upload + taskService.updateTask logic.
// Adds: live image preview, drag-and-drop, better empty state.
// ─────────────────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import { Loader2, X, Camera, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { storageService } from '../lib/services/storageService';
import { taskService } from '../lib/services/taskService';
import { useSystem } from './SystemUI';
import { uuid } from '../lib/utils/ids';

const TaskCompletionModal = ({ projectId, completingIssue, issues, currentUser, onClose, onTaskCompleted }) => {
  const { toast } = useSystem();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('Please pick an image file (PNG, JPG, WebP).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Image is too big. Max 10 MB.');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const complete = async (e) => {
    e.preventDefault();
    if (!file || !completingIssue) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop();
      const path = `projects/${projectId}/tasks/${completingIssue.id}/screenshot_${Date.now()}.${ext}`;
      const url = await storageService.uploadFile(path, file);
      const targetIssue = issues.find(i => i.id === completingIssue.id);
      const newComment = {
        id: uuid(),
        text: `Task dragged from ${completingIssue.sourceStatus} to Done. Pending Approval.`,
        author: currentUser?.name || 'System',
        role: currentUser?.role || 'worker',
        timestamp: new Date().toISOString(),
        isSystem: true,
      };
      const updatedComments = [...(targetIssue?.comments || []), newComment];
      await taskService.updateTask(projectId, completingIssue.id, {
        status: 'Done', screenshotUrl: url, isApproved: false, comments: updatedComments,
      });
      onTaskCompleted({ ...targetIssue, status: 'Done', screenshotUrl: url, isApproved: false, comments: updatedComments });
      onClose();
    } catch (err) {
      console.error('Error uploading screenshot:', err);
      toast.error('Failed to save screenshot.');
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget && !uploading) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(8,7,6,0.62)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
      <div className="animate-slide-up"
        style={{
          width: '95vw', maxWidth: 480,
          background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 30, height: 30, borderRadius: 'var(--radius-md)',
              background: 'var(--accent-success-muted)', color: 'var(--accent-success-text)',
              border: '1px solid var(--accent-success-border)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><Camera size={14}/></span>
            <div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: 'var(--text-tertiary)',
              }}>Mark as done</div>
              <div style={{ marginTop: 2, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Upload proof of completion
              </div>
            </div>
          </div>
          <button onClick={onClose} disabled={uploading}
            style={{
              width: 28, height: 28, padding: 0, borderRadius: 'var(--radius-sm)',
              background: 'transparent', border: 'none', cursor: uploading ? 'default' : 'pointer',
              color: 'var(--text-secondary)', opacity: uploading ? 0.4 : 1,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={14}/></button>
        </div>

        {/* Body */}
        <form onSubmit={complete} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Attach a screenshot showing the work is done. Your CEO will review and approve.
          </p>

          {/* Drop zone */}
          {!file ? (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false);
                acceptFile(e.dataTransfer.files?.[0]);
              }}
              style={{
                padding: 28, borderRadius: 'var(--radius-md)',
                background: dragging ? 'var(--accent-primary-muted)' : 'var(--bg-secondary)',
                border: `1.5px dashed ${dragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                textAlign: 'center', transition: 'background 0.15s, border-color 0.15s',
              }}>
              <span style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ImageIcon size={18}/>
              </span>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Drop a screenshot here, or click to choose
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>
                  PNG, JPG, WebP · max 10 MB
                </div>
              </div>
              <input ref={inputRef} type="file" accept="image/*"
                onChange={(e) => acceptFile(e.target.files?.[0])}
                style={{ display: 'none' }} required/>
            </label>
          ) : (
            <div style={{
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
              border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
            }}>
              <div style={{ position: 'relative', background: '#000' }}>
                <img src={preview} alt="Preview"
                  style={{ display: 'block', width: '100%', maxHeight: 280, objectFit: 'contain' }}/>
                <button type="button" onClick={clearFile} disabled={uploading}
                  title="Remove"
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 28, height: 28, padding: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
                    backdropFilter: 'blur(8px)',
                    cursor: uploading ? 'default' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}><X size={13}/></button>
              </div>
              <div style={{
                padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.8125rem', color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-color)',
              }}>
                <ImageIcon size={13} style={{ color: 'var(--text-tertiary)' }}/>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {file.name}
                </span>
                <span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--alert-error-bg)', color: 'var(--alert-error-text)',
              border: '1px solid var(--alert-error-border)',
              fontSize: '0.8125rem', fontWeight: 500,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
            <button type="submit" className="btn btn-primary"
              disabled={uploading || !file}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {uploading ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
              {uploading ? 'Uploading…' : 'Mark complete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskCompletionModal;
