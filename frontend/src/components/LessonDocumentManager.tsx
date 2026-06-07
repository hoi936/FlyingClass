import React, { useState, useEffect } from 'react';
import { classService } from '../services/api';
import { Folder, Link as LinkIcon, ChevronLeft, Plus, Trash2, X, Maximize, Minimize, Edit2 } from 'lucide-react';

interface LessonDocumentManagerProps {
  classId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  isReadOnly?: boolean;
}

export const LessonDocumentManager: React.FC<LessonDocumentManagerProps> = ({ classId, lessonId, lessonTitle, onClose, isReadOnly = false }) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', type: 'Link' as 'Folder'|'Link', url: '' });
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isExpandedViewer, setIsExpandedViewer] = useState(false);
  
  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Thư mục gốc'}]);

  useEffect(() => {
    fetchDocuments();
  }, [classId, lessonId, currentFolderId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await classService.getDocuments(classId, currentFolderId, lessonId);
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDocument = async () => {
    try {
      if (editingDocId) {
        await classService.updateDocument(editingDocId, docForm.name, docForm.url);
      } else {
        await classService.createDocument(classId, docForm.name, docForm.type, currentFolderId, docForm.url, lessonId);
      }
      setShowDocModal(false);
      setEditingDocId(null);
      setDocForm({ name: '', type: 'Link', url: '' });
      fetchDocuments();
    } catch (err: any) {
      console.error('SAVE DOC ERROR:', err?.response?.data);
      const serverMsg = err?.response?.data?._server_messages || err?.response?.data?.message || err?.message || '';
      alert('Lỗi lưu tài liệu: ' + serverMsg);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if(!window.confirm('Bạn có chắc muốn xóa?')) return;
    try {
      await classService.deleteDocument(id);
      fetchDocuments();
    } catch (err) {
      alert('Lỗi xóa tài liệu');
    }
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
        let videoId = '';
        if (url.includes('youtube.com/watch')) {
          videoId = new URL(url).searchParams.get('v') || '';
        } else {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        }
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (url.includes('drive.google.com/file/d/')) {
        const fileId = url.split('/d/')[1].split('/')[0];
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      if (url.includes('docs.google.com') && url.includes('/edit')) {
        return url.replace('/edit', '/preview');
      }
      return url;
    } catch(e) {
      return url;
    }
  };

  return (
    <div className={`absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ${isExpandedViewer ? 'p-0' : 'p-2'}`}>
      <div className={`bg-white dark:bg-slate-800 shadow-2xl flex flex-col overflow-hidden border-slate-200 dark:border-slate-700 transition-all duration-300 ${isExpandedViewer ? 'w-full h-full border-0 rounded-none' : (selectedDocument ? 'w-[98vw] h-[98vh] max-h-[98vh] rounded-xl border' : 'w-full max-w-5xl h-[90vh] max-h-[95vh] rounded-xl border')}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center">
              <Folder className="mr-2 text-indigo-500" /> Tài liệu: {lessonTitle}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-50/50 dark:bg-slate-900/20">
          
          {/* Left Pane - Document List */}
          <div className={`${isExpandedViewer ? 'hidden' : (selectedDocument ? 'w-1/4 border-r border-slate-200 dark:border-slate-700' : 'w-full')} p-4 overflow-y-auto flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {folderHistory.length > 1 && (
                  <button 
                    onClick={() => {
                      const newHistory = [...folderHistory];
                      newHistory.pop();
                      const prevFolder = newHistory[newHistory.length - 1];
                      setFolderHistory(newHistory);
                      setCurrentFolderId(prevFolder.id);
                      setSelectedDocument(null);
                    }}
                    className="flex items-center text-sm text-blue-500 hover:text-blue-600 transition bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-lg"
                  >
                    <ChevronLeft size={16} className="mr-1" /> Quay lại
                  </button>
                )}
                {!selectedDocument && (
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center">
                    {folderHistory.map((f, i) => (
                      <React.Fragment key={i}>
                        <span className={i === folderHistory.length - 1 ? "text-slate-900 dark:text-white" : ""}>
                          {f.name}
                        </span>
                        {i < folderHistory.length - 1 && <span className="mx-2">/</span>}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              
              {!isReadOnly && !selectedDocument && (
                <button onClick={() => {
                  setEditingDocId(null);
                  setDocForm({ name: '', type: 'Link', url: '' });
                  setShowDocModal(true);
                }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center shadow-lg shadow-indigo-500/20">
                  <Plus size={16} className="mr-1.5" /> Thêm Tài Liệu
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center p-8 text-slate-500">Đang tải...</div>
            ) : (
              <div className="space-y-2 flex-1">
                {documents.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 text-sm">
                    Thư mục trống.
                  </div>
                ) : (
                  documents.map(doc => (
                    <div key={doc.name} className={`border p-3 rounded-xl flex items-center justify-between hover:shadow-md transition group ${selectedDocument?.name === doc.name ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      <div className="flex items-center flex-1 cursor-pointer overflow-hidden" onClick={() => {
                        if(doc.doc_type === 'Folder') {
                          setFolderHistory([...folderHistory, {id: doc.name, name: doc.document_name}]);
                          setCurrentFolderId(doc.name);
                          setSelectedDocument(null);
                        } else if (doc.link_url) {
                          setSelectedDocument(doc);
                        }
                      }}>
                        <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center mr-3 bg-slate-50 dark:bg-slate-900">
                          {doc.doc_type === 'Folder' ? <Folder size={20} className="text-yellow-400" /> : <LinkIcon size={20} className="text-blue-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${selectedDocument?.name === doc.name ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>{doc.document_name}</p>
                          {doc.doc_type === 'Link' && !selectedDocument && <p className="text-xs text-slate-500 truncate max-w-md">{doc.link_url}</p>}
                        </div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button onClick={(e) => {
                            e.stopPropagation();
                            setEditingDocId(doc.name);
                            setDocForm({ name: doc.document_name, type: doc.doc_type, url: doc.link_url || '' });
                            setShowDocModal(true);
                          }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.name);
                          }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Pane - Document Viewer */}
          {selectedDocument && (
            <div className={`${isExpandedViewer ? 'w-full' : 'w-3/4'} flex flex-col bg-slate-100/50 dark:bg-slate-900/50 transition-all duration-300`}>
              <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                <div className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                  <LinkIcon size={16} className="mr-2 text-blue-500" />
                  <span className="truncate max-w-md">{selectedDocument.document_name}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsExpandedViewer(!isExpandedViewer)} className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg transition flex items-center">
                    {isExpandedViewer ? <Minimize size={14} className="mr-1.5" /> : <Maximize size={14} className="mr-1.5" />}
                    {isExpandedViewer ? 'Thu nhỏ' : 'Toàn màn hình'}
                  </button>
                  <button onClick={() => window.open(selectedDocument.link_url, '_blank')} className="text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg transition flex items-center">
                    Mở trong trình duyệt
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="w-full h-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
                  {selectedDocument.link_url ? (
                    <iframe 
                      src={getEmbedUrl(selectedDocument.link_url)} 
                      title={selectedDocument.document_name}
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      Tài liệu không có đường dẫn
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Add Document Modal */}
      {showDocModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{editingDocId ? 'Chỉnh Sửa Tài Liệu' : 'Thêm Tài Liệu Mới'}</h3>
            <div className="space-y-4 mb-6">
              {!editingDocId && (
                <div className="flex gap-4">
                  <label className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                    <input type="radio" name="doc_type" value="Link" checked={docForm.type === 'Link'} onChange={e => setDocForm({...docForm, type: 'Link'})} className="mr-2 text-indigo-600" />
                    Link (Video/Web/PDF)
                  </label>
                  <label className="flex items-center text-sm text-slate-700 dark:text-slate-300">
                    <input type="radio" name="doc_type" value="Folder" checked={docForm.type === 'Folder'} onChange={e => setDocForm({...docForm, type: 'Folder', url: ''})} className="mr-2 text-indigo-600" />
                    Thư mục
                  </label>
                </div>
              )}
              <input type="text" placeholder="Tên tài liệu / thư mục" value={docForm.name} onChange={e => setDocForm({...docForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              {docForm.type === 'Link' && (
                <input type="text" placeholder="Đường dẫn URL (Youtube, Google Drive...)" value={docForm.url} onChange={e => setDocForm({...docForm, url: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveDocument} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold">{editingDocId ? 'Lưu' : 'Thêm'}</button>
              <button onClick={() => { setShowDocModal(false); setEditingDocId(null); }} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
