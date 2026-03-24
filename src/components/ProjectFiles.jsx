import React, { useState, useEffect, useRef } from 'react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { Loader2, UploadCloud, FileText, Trash2, Download } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

export default function ProjectFiles({ projectId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const folderRef = ref(storage, `projects/${projectId}/files`);
      const res = await listAll(folderRef);
      const filePromises = res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          url,
          ref: itemRef
        };
      });
      const fileList = await Promise.all(filePromises);
      setFiles(fileList);
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setUploading(true);
    triggerHaptic('light');
    try {
       // use timestamp to prevent overwrites of same-named files
      const timestamp = Date.now();
      const fileRef = ref(storage, `projects/${projectId}/files/${timestamp}_${selectedFile.name}`);
      await uploadBytes(fileRef, selectedFile);
      triggerHaptic('success');
      fetchFiles(); // Refresh list
    } catch (err) {
      console.error("Error uploading file:", err);
      triggerHaptic('error');
      alert("Failed to upload file. Check Firebase Storage rules.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileRef) => {
    if (!window.confirm(`Are you sure you want to delete this file?`)) return;
    try {
      setLoading(true);
      await deleteObject(fileRef);
      triggerHaptic('heavy');
      setFiles(files.filter(f => f.ref.fullPath !== fileRef.fullPath));
    } catch (err) {
      console.error("Error deleting file:", err);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ padding: '0 2rem 2rem 2rem', overflowY: 'auto' }}>
      
      {/* Upload Zone */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`upload-zone ${!uploading ? 'upload-zone-hoverable' : ''}`}
        style={{
          border: '2px dashed #333333',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: '#0A0A0A',
          transition: 'border-color 0.2s',
          marginTop: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleUpload} 
          style={{ display: 'none' }} 
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-secondary" size={28} />
            <span style={{ color: '#888888', fontSize: '14px', fontWeight: 500 }}>Uploading to Vault...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud size={28} style={{ color: '#888888' }} />
            <span style={{ color: '#FFFFFF', fontSize: '15px', fontWeight: 600 }}>Click to upload file</span>
            <span style={{ color: '#666666', fontSize: '13px' }}>PDFs, Images, Code snippets, and Documents</span>
          </div>
        )}
      </div>

      {/* File List */}
      <div>
        <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, margin: '0 0 1rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Project Assets ({files.length})
        </h4>
        
        {loading && files.length === 0 ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-secondary" /></div>
        ) : files.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', border: '1px solid #222222', borderRadius: '12px', color: '#666666', fontSize: '14px' }}>
            No files uploaded to this project yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {files.map((file, i) => {
              // Extract original filename without timestamp
              const rawFileName = file.name.split('_').slice(1).join('_') || file.name;
              
              return (
                <div 
                  key={i}
                  className="flex items-center justify-between"
                  style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid #222222',
                    borderRadius: '10px',
                    padding: '1rem',
                    animation: `slideUpFade 0.3s ease-out forwards ${i * 0.05}s`
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div style={{ padding: '0.6rem', backgroundColor: '#1A1A1A', borderRadius: '8px', flexShrink: 0 }}>
                      <FileText size={18} style={{ color: '#AAAAAA' }} />
                    </div>
                    <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rawFileName}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      title="Download"
                      className="btn-icon-hover"
                      style={{ padding: '0.5rem', borderRadius: '6px' }}
                    >
                      <Download size={16} />
                    </a>
                    <button 
                      title="Delete File"
                      onClick={() => handleDelete(file.ref)}
                      className="btn-danger-hover"
                      style={{ padding: '0.5rem', borderRadius: '6px' }}
                    >
                      <Trash2 size={16} />
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
