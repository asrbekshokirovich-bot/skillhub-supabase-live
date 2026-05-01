import React, { useState, useEffect } from 'react';
import { Loader2, User, Clock, AlertCircle, Info, Image as ImageIcon } from 'lucide-react';
import { taskService } from '../lib/services/taskService';
import { storageService } from '../lib/services/storageService';
import DOMPurify from 'dompurify';
import { useSystem } from './SystemUI';

const GhostDropdown = ({ value, onChange, options, prefix }) => {
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;
  return (
    <div 
      style={{ display: 'flex', width: 'fit-content', alignItems: 'center', position: 'relative', marginLeft: '-8px', borderRadius: '6px', transition: 'background-color 0.2s', padding: '6px 10px' }}
      onMouseOver={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {prefix && <div style={{ marginRight: '8px' }}>{prefix}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#E5E7EB', fontSize: '14px', fontWeight: 600 }}>
          {selectedLabel}
        </span>
        <svg style={{ color: '#888' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', zIndex: 1 }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#111', color: 'white' }}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
};

const NewTaskModal = ({ projectId, projectAssignee, users, currentUser, onClose, onTaskCreated }) => {
  const { toast, showConfirm } = useSystem();
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('Feature');
  const [newUrgency, setNewUrgency] = useState('Medium');
  const [newAssignee, setNewAssignee] = useState(projectAssignee && projectAssignee !== 'Unassigned' ? projectAssignee : '');
  const [newScreenshotFile, setNewScreenshotFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        status: 'To Do',
        urgency: newUrgency,
        assignee: newAssignee || 'Unassigned',
        screenshotUrl: url,
        timeEstimated: 0,
        startDate: null,
        dueDate: null,
        tags: []
      };
      
      const createdTask = await taskService.createTask(projectId, newTask);
      onTaskCreated(createdTask);
      onClose();
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error('Failed to create task: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEmptyDesc = !newDescription || newDescription.replace(/<[^>]*>?/gm, '').trim() === '';
  const isDirty = Boolean(newTitle || (!isEmptyDesc && newDescription !== ''));

  const handleClose = React.useCallback(async () => {
    if (isDirty) {
      const discard = await showConfirm('You have unsaved changes. Discard?', 'Discard Changes?');
      if (!discard) return;
    }
    onClose();
  }, [isDirty, onClose, showConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={handleClose}>
      <div 
        className="relative flex flex-col shadow-2xl" 
        style={{ width: '95vw', maxWidth: '800px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Create New Task</h3>
        </div>
        
        <form onSubmit={addIssue} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="custom-scrollbar" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* Title */}
            <div>
              <input 
                type="text" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                placeholder="Issue Title..." 
                className="w-full bg-transparent border-none outline-none"
                style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: 'var(--text-primary)', 
                  padding: 0,
                  boxShadow: 'none',
                  border: 'none',
                  backgroundColor: 'transparent'
                }} 
                autoFocus
                required
              />
            </div>

            {/* Metadata Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <User size={12} color="#666" /> Assignee
                </label>
                <GhostDropdown 
                  value={newAssignee || 'Unassigned'} 
                  onChange={setNewAssignee} 
                  options={[{value:'Unassigned', label:'Unassigned'}, ...(users || []).map(u => ({ value: u.id, label: u.name }))]}
                />
                {newAssignee === projectAssignee && projectAssignee && projectAssignee !== 'Unassigned' && (
                  <div className="animate-fade-in" style={{ marginTop: '12px', fontSize: '10.5px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '200px', fontWeight: '500', lineHeight: '1.2' }}>
                    <Info size={12} style={{ flexShrink: 0 }} /> Auto-selected from Project Lead.
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertCircle size={12} color="#666" /> Urgency
                </label>
                <GhostDropdown 
                  value={newUrgency} 
                  onChange={setNewUrgency} 
                  options={[{value:'Low', label:'Low'}, {value:'Medium', label:'Medium'}, {value:'High', label:'High'}]}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Description</label>
              <div style={{ position: 'relative' }}>
                <div 
                  style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    color: 'var(--text-tertiary)',
                    pointerEvents: 'none',
                    fontSize: '15px',
                    display: isEmptyDesc ? 'block' : 'none'
                  }}
                >
                  Add description...
                </div>
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={e => setNewDescription(e.currentTarget.innerHTML)}
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

            {/* Screenshot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Attach Screenshot (Optional)</label>
              <label 
                className="hover-elevate"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '16px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <ImageIcon size={18} />
                {newScreenshotFile ? <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{newScreenshotFile.name}</span> : <span>Click to upload an image</span>}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setNewScreenshotFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button 
              type="button" 
              disabled={isSubmitting} 
              onClick={handleClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !newTitle}
              className="btn btn-primary"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        
        .rich-text-editor {
          overflow-x: hidden !important;
          outline: none !important;
        }
        .rich-text-editor:focus {
          outline: none !important;
          box-shadow: inset 0 0 0 1px #555 !important;
        }
        .rich-text-editor * {
          font-size: inherit !important;
          font-family: inherit !important;
          line-height: inherit !important;
        }
        .rich-text-editor p, .rich-text-editor div {
          margin-top: 0 !important;
          margin-bottom: 0.5em !important;
        }
        .rich-text-editor ul {
          list-style-type: disc !important;
          padding-left: 24px !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .rich-text-editor ol {
          list-style-type: decimal !important;
          padding-left: 24px !important;
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
        }
        .rich-text-editor li {
          display: list-item !important;
          margin-bottom: 0.25em !important;
        }
        .rich-text-editor li > p, .rich-text-editor li > div {
          display: inline !important;
          margin: 0 !important;
        }
        .rich-text-editor blockquote {
          border-left: 3px solid #6366f1 !important;
          padding-left: 12px !important;
          margin: 1em 0 !important;
          color: #999 !important;
          font-style: italic !important;
        }
        .rich-text-editor a {
          color: #6366f1 !important;
          text-decoration: underline !important;
        }
        .rich-text-editor strong, .rich-text-editor b {
          font-weight: 700 !important;
        }
        .rich-text-editor em, .rich-text-editor i {
          font-style: italic !important;
        }
      `}} />
    </div>
  );
};

export default NewTaskModal;
