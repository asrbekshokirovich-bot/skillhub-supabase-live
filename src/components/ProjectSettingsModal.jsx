import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, Edit3, User, Wand2, UploadCloud, Link, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { projectService } from '../lib/services/projectService';
import DOMPurify from 'dompurify';
import { useSystem } from './SystemUI';
import { fileExtractionService } from '../lib/services/fileExtractionService';
import { aiTaskService } from '../lib/services/aiTaskService';
import { taskService } from '../lib/services/taskService';

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
  const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10), 0, 0, 0);
  if (isNaN(date.getTime())) throw new Error("Invalid date");
  return date.toISOString();
};

const formatDateToDDMMYYYY = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function ProjectSettingsModal({ project, onClose, onProjectUpdated, onTasksGenerated, onProjectDeleted }) {
  const { toast, showConfirm } = useSystem();
  
  const [projectName, setProjectName] = useState(project.name || '');
  const [clientName, setClientName] = useState(project.client || '');
  const [startDate, setStartDate] = useState(formatDateToDDMMYYYY(project.startDate));
  const [dueDate, setDueDate] = useState(formatDateToDDMMYYYY(project.dueDate));
  const [projectDescription, setProjectDescription] = useState(project.projectDescription || '');
  const [clientNotes, setClientNotes] = useState(project.clientNotes || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [magicUrl, setMagicUrl] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicStatus, setMagicStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [generatedTasksCount, setGeneratedTasksCount] = useState(0);

  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [promptStartDate, setPromptStartDate] = useState('');
  const [promptDueDate, setPromptDueDate] = useState('');
  const [pendingTextToProcess, setPendingTextToProcess] = useState(null);
  const [reviewData, setReviewData] = useState(null);

  const processExtractedText = async (text, overrideStartDate = null, overrideDueDate = null) => {
    const activeStart = overrideStartDate || startDate;
    const activeDue = overrideDueDate || dueDate;

    setIsMagicLoading(true);
    try {
      setMagicStatus('AI Analyzing phases...');
      const result = await aiTaskService.generateTasksFromPlan(text);
      
      if (!result.tasks || result.tasks.length === 0) {
        throw new Error('No tasks could be identified.');
      }

      setReviewData({
        tasks: result.tasks,
        issuesDetected: result.issuesDetected || [],
        activeStart: activeStart,
        activeDue: activeDue
      });
      toast.success('AI analysis complete! Please review the tasks.');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to generate tasks.');
    } finally {
      setIsMagicLoading(false);
      setMagicStatus('');
    }
  };

  const handleApproveGeneration = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!reviewData) return;
    setIsMagicLoading(true);
    setMagicStatus(`Creating ${reviewData.tasks.length} tasks...`);
    
    let createdCount = 0;
    try {
      for (const t of reviewData.tasks) {
        await taskService.createTask(project.id, {
          title: t.title,
          description: t.description,
          status: 'To Do',
          urgency: 'Medium',
          assignee: project.assignee || 'Unassigned',
          startDate: project.startDate || null,
          dueDate: project.dueDate || null
        });
        createdCount++;
      }
      
      setGeneratedTasksCount(createdCount);
      toast.success(`Successfully generated ${createdCount} tasks!`);
      if (onTasksGenerated) onTasksGenerated();
      setMagicUrl('');
      setReviewData(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create tasks.');
    } finally {
      setIsMagicLoading(false);
      setMagicStatus('');
      setTimeout(() => setGeneratedTasksCount(0), 5000);
    }
  };

  const handlePromptContinue = () => {
    if (!promptStartDate || !promptDueDate) {
      toast.error('Both Start Date and Deadline are required to proceed.');
      return;
    }
    setShowDatePrompt(false);
    processExtractedText(pendingTextToProcess, promptStartDate, promptDueDate);
  };

  const handleMagicUrlSubmit = async (e) => {
    e.preventDefault();
    if (!magicUrl.trim()) return;
    setIsMagicLoading(true);
    setMagicStatus('Fetching URL content...');
    try {
      const text = await fileExtractionService.extractTextFromUrl(magicUrl);
      await processExtractedText(text);
    } catch (err) {
      setIsMagicLoading(false);
      setMagicStatus('');
      toast.error(err.message);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setIsMagicLoading(true);
    setMagicStatus('Analyzing document...');
    try {
      const dataPayload = await fileExtractionService.extractDataFromFile(file);
      await processExtractedText(dataPayload);
    } catch (err) {
      setIsMagicLoading(false);
      setMagicStatus('');
      toast.error(err.message);
    }
  };

  const handleFileSelect = (e) => {
    processFile(e.target.files?.[0]);
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

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

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!projectName) return;
    
    setIsSubmitting(true);
    try {
      let parsedStartDate = project.startDate;
      if (startDate) {
        try {
          parsedStartDate = parseDDMMYYYYtoISO(startDate);
        } catch (e) {
          toast.error("Please enter a valid start date (DD/MM/YYYY).");
          setIsSubmitting(false);
          return;
        }
      }

      let parsedDueDate = project.dueDate;
      if (dueDate) {
        try {
          parsedDueDate = parseDDMMYYYYtoISO(dueDate);
        } catch (e) {
          toast.error("Please enter a valid deadline date (DD/MM/YYYY).");
          setIsSubmitting(false);
          return;
        }
      }

      const updatedProject = await projectService.updateProject(project.id, {
        name: projectName.trim(),
        client: clientName.trim(),
        startDate: parsedStartDate,
        dueDate: parsedDueDate,
        projectDescription: projectDescription,
        clientNotes: clientNotes
      });
      
      toast.success('Project settings updated!');
      onProjectUpdated(updatedProject);
      onClose();
    } catch (err) {
      console.error("Error updating project:", err);
      toast.error('Failed to update project settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <style>
      {`
        .magic-task-desc ul {
          list-style-type: disc;
          padding-left: 24px;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .magic-task-desc ol {
          list-style-type: decimal;
          padding-left: 24px;
          margin-top: 4px;
          margin-bottom: 4px;
        }
        .magic-task-desc li {
          margin-bottom: 2px;
        }
      `}
    </style>
    <div className="fixed inset-0 animate-fade-in flex items-center justify-center" style={{ zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div 
        className="relative flex flex-col shadow-2xl" 
        style={{ width: '95vw', maxWidth: '800px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Edit3 size={18} className="text-primary" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Project Settings</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="custom-scrollbar" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* Title */}
            <div>
              <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' }}>
                Project Name
              </label>
              <input 
                type="text" 
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)} 
                placeholder="Project Name..." 
                className="w-full bg-transparent outline-none"
                style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: 'var(--text-primary)', 
                  padding: '8px 0',
                  boxShadow: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  borderRadius: 0,
                  backgroundColor: 'transparent'
                }} 
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {/* Client Name */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <User size={12} color="#666" /> Client / Organization
                </label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                  className="input w-full"
                  style={{ padding: '12px', fontSize: '14px', borderRadius: '8px' }}
                  required
                />
              </div>

              {/* Start Date */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Calendar size={12} color="#666" /> Start Date (DD/MM/YYYY)
                </label>
                <input 
                  type="text" 
                  value={startDate} 
                  onChange={(e) => setStartDate(formatToDateMask(e.target.value))} 
                  placeholder="DD/MM/YYYY"
                  className="input w-full"
                  style={{ padding: '12px', fontSize: '14px', letterSpacing: '0.05em', borderRadius: '8px' }}
                  maxLength={10}
                />
              </div>

              {/* Deadline (Due Date) */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Calendar size={12} color="#666" /> Deadline (DD/MM/YYYY)
                </label>
                <input 
                  type="text" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(formatToDateMask(e.target.value))} 
                  placeholder="DD/MM/YYYY"
                  className="input w-full"
                  style={{ padding: '12px', fontSize: '14px', letterSpacing: '0.05em', borderRadius: '8px' }}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Client Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Client Notes (Initial Meeting)</label>
              <textarea 
                className="input w-full custom-scrollbar"
                placeholder="Jot down raw notes here during your initial client call..."
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                style={{ padding: '16px', fontSize: '15px', minHeight: '120px', backgroundColor: 'var(--bg-secondary)', resize: 'vertical' }}
              />
            </div>

            {/* Description (Phased Plan) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Project Description (Phased Plan)</label>
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
                  dangerouslySetInnerHTML={{ __html: projectDescription }}
                  className="w-full text-[15px] leading-[1.6] transition-colors overflow-y-auto rich-text-editor custom-scrollbar cursor-text"
                  style={{ 
                    whiteSpace: 'normal', 
                    wordBreak: 'break-word', 
                    minHeight: '240px',
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

            {/* Magic Task Generator */}
            <div style={{ 
              marginTop: '16px', 
              padding: '20px', 
              borderRadius: '12px', 
              background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
                  <Wand2 size={16} color="#8b5cf6" />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
                  {reviewData ? 'Review AI Generation' : 'Magic Task Generator'}
                </h4>
                {generatedTasksCount > 0 && !reviewData && (
                  <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                    <CheckCircle2 size={14} /> Generated {generatedTasksCount} tasks
                  </span>
                )}
              </div>
              
              {reviewData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                  {reviewData.issuesDetected && reviewData.issuesDetected.length > 0 && (
                    <div style={{ padding: '12px', backgroundColor: 'var(--alert-warning-bg, rgba(245, 158, 11, 0.1))', border: '1px solid var(--alert-warning-border, rgba(245, 158, 11, 0.3))', borderRadius: '8px' }}>
                      <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--alert-warning-text, #d97706)', margin: '0 0 8px 0' }}>Magic Task Generator spotted a few typos and fixed them:</h5>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                        {reviewData.issuesDetected.map((issue, idx) => (
                          <li key={idx} style={{ marginBottom: '8px' }}>
                            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>"{issue.originalText}"</span>
                            {' '}was detected as an issue and has been fixed to{' '}
                            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '2px 6px', borderRadius: '4px', fontWeight: '500' }}>"{issue.fixedText}"</span>.
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {reviewData.tasks.map((t, idx) => (
                      <div key={idx} style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <h5 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            const newTasks = [...reviewData.tasks];
                            newTasks[idx].title = e.currentTarget.textContent;
                            setReviewData({...reviewData, tasks: newTasks});
                          }}
                          style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 4px 0', color: 'var(--text-primary)', outline: 'none', borderBottom: '1px dashed transparent' }}
                          onFocus={e => e.currentTarget.style.borderBottom = '1px dashed var(--border-color)'}
                          onBlurCapture={e => e.currentTarget.style.borderBottom = '1px dashed transparent'}
                        >{t.title}</h5>
                        <div 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            const newTasks = [...reviewData.tasks];
                            newTasks[idx].description = e.currentTarget.innerHTML;
                            setReviewData({...reviewData, tasks: newTasks});
                          }}
                          onPaste={handleRichTextPaste}
                          className="rich-text-editor magic-task-desc cursor-text"
                          style={{ fontSize: '12px', color: 'var(--text-secondary)', outline: 'none', minHeight: '30px', padding: '8px 12px', border: '1px solid transparent', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', marginTop: '6px' }}
                          onFocus={e => { e.currentTarget.style.border = '1px solid var(--border-color)'; e.currentTarget.style.backgroundColor = 'var(--bg-primary)'; }}
                          onBlurCapture={e => { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                          dangerouslySetInnerHTML={{ __html: t.description }} 
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setReviewData(null)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                      disabled={isMagicLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={handleApproveGeneration}
                      className="btn btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', background: '#8b5cf6', color: 'white', border: 'none' }}
                      disabled={isMagicLoading}
                    >
                      {isMagicLoading ? <Loader2 size={14} className="animate-spin" /> : 'Approve & Generate'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Drop a <b>PDF</b>, <b>DOCX</b>, or paste a <b>landing page URL</b> containing the phased plan. AI will automatically read it and generate tasks for you.
                  </p>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {/* Drag and drop zone */}
                <div 
                  onClick={() => document.getElementById('magic-file-upload').click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                  onDrop={handleFileDrop}
                  style={{
                    flex: 1,
                    minWidth: '250px',
                    border: `2px dashed ${isDragOver ? '#8b5cf6' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: isDragOver ? 'rgba(139, 92, 246, 0.05)' : 'var(--bg-secondary)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <input 
                    type="file" 
                    id="magic-file-upload" 
                    style={{ display: 'none' }} 
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileSelect} 
                  />
                  {isMagicLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500', textAlign: 'center' }}>{magicStatus}</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={24} color={isDragOver ? '#8b5cf6' : '#888'} />
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'block' }}>Drop file here</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PDF, DOCX, TXT</span>
                      </div>
                    </>
                  )}
                </div>

                {/* URL Input */}
                <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link size={12} /> Or paste URL
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="url" 
                      value={magicUrl}
                      onChange={e => setMagicUrl(e.target.value)}
                      placeholder="https://..."
                      className="input flex-1"
                      style={{ padding: '10px 12px', fontSize: '13px', borderRadius: '8px' }}
                      disabled={isMagicLoading}
                    />
                    <button 
                      type="button" 
                      onClick={handleMagicUrlSubmit}
                      disabled={isMagicLoading || !magicUrl.trim()}
                      className="btn"
                      style={{ 
                        background: '#8b5cf6', 
                        color: 'white', 
                        padding: '10px 16px', 
                        borderRadius: '8px',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '500',
                        fontSize: '13px',
                        opacity: (isMagicLoading || !magicUrl.trim()) ? 0.6 : 1
                      }}
                    >
                      {isMagicLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </>
              )}
            </div>


          </div>

          <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn flex items-center gap-2"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px 12px' }}
              onClick={async () => {
                const confirmed = await showConfirm('Are you sure you want to delete this project? This action cannot be undone and will delete all tasks.', 'Delete Project?');
                if (confirmed) {
                  try {
                    await projectService.deleteProject(project.id);
                    toast.success('Project deleted successfully.');
                    if (onProjectDeleted) onProjectDeleted(project.id);
                  } catch (err) {
                    toast.error('Failed to delete project.');
                  }
                }
              }}
            >
              <Trash2 size={16} /> Delete Project
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSave}
                disabled={isSubmitting || !projectName}
                className="btn btn-primary"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
