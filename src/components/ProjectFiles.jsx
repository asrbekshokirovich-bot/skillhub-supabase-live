import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { storageService } from '../lib/services/storageService';
import { Loader2, UploadCloud, FileText, Trash2, Download } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { useSystem } from './SystemUI';

// SYSTEM RULE: No hardcoded hex colors. All styling uses CSS variables.
export default function ProjectFiles({ projectId }) {
  const { toast, showConfirm } = useSystem();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('skillhub-bucket').list(`projects/${projectId}/files`);
      if (error) throw error;
      if (!data) return;
      const fileList = data
        .filter(item => item.name !== '.emptyFolderPlaceholder')
        .map(item => {
          const { data: { publicUrl } } = supabase.storage.from('skillhub-bucket').getPublicUrl(`projects/${projectId}/files/${item.name}`);
          return { name: item.name, url: publicUrl, fullPath: `projects/${projectId}/files/${item.name}` };
        });
      setFiles(fileList);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setUploading(true);
    triggerHaptic('light');
    try {
      const path = `projects/${projectId}/files/${Date.now()}_${selectedFile.name}`;
      await storageService.uploadFile(path, selectedFile);
      triggerHaptic('success');
      fetchFiles();
    } catch (err) {
      console.error('Error uploading file:', err);
      triggerHaptic('error');
      toast.error('Failed to upload file. Check storage permissions.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (file) => {
    const confirmed = await showConfirm(`Delete "${file.name.split('_').slice(1).join('_') || file.name}"?`, 'Delete File?');
    if (!confirmed) return;
    try {
      setLoading(true);
      const { error } = await supabase.storage.from('skillhub-bucket').remove([file.fullPath]);
      if (error) throw error;
      triggerHaptic('heavy');
      setFiles(files.filter(f => f.fullPath !== file.fullPath));
      toast.success('File deleted');
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('Failed to delete file');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full custom-scrollbar" style={{ padding: '0 1.5rem 1.5rem', overflowY: 'auto' }}>
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: '2px dashed var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: 'var(--bg-secondary)',
          transition: 'border-color 0.2s',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <input type="file" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin" size={26} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud size={26} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>Click to upload file</span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>PDFs, Images, Code snippets, and Documents</span>
          </div>
        )}
      </div>

      {/* File List */}
      <div>
        <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Project Assets ({files.length})
        </h4>
        {loading && files.length === 0 ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : files.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
            No files uploaded to this project yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {files.map((file, i) => {
              const rawFileName = file.name.split('_').slice(1).join('_') || file.name;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.875rem 1rem',
                    animation: `slideUpFade 0.3s ease-out forwards ${i * 0.05}s`,
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}>
                      <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rawFileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Download"
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.6rem', lineHeight: 0, display: 'inline-flex' }}
                    >
                      <Download size={14} />
                    </a>
                    <button
                      title="Delete File"
                      onClick={() => handleDelete(file)}
                      className="btn"
                      style={{ padding: '0.35rem 0.6rem', lineHeight: 0, backgroundColor: 'var(--alert-error-bg)', color: 'var(--alert-error-text)', border: '1px solid var(--alert-error-border)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
