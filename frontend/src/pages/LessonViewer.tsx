import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const LessonViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLesson();
    }
  }, [id]);

  const loadLesson = async () => {
    try {
      const res = await api.get(`/api/resource/FC Lesson/${id}`);
      setLesson(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  if (!lesson) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-red-400">Không tìm thấy bài học.</div>;

  // Xử lý link youtube để nhúng iFrame
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : url;
  };

  const embedUrl = getEmbedUrl(lesson.video_url);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <nav className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white mr-4 transition-colors flex items-center">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Quay lại
            </button>
            <h1 className="font-bold text-xl truncate">{lesson.title}</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {embedUrl && (
          <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-black/50 border border-slate-200/50 dark:border-slate-700/50">
            <iframe 
              src={embedUrl} 
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        )}

        <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-2xl font-bold mb-6 text-blue-400">Nội dung bài học</h2>
          <div 
            className="prose prose-invert prose-blue max-w-none text-slate-700 dark:text-slate-300 leading-relaxed" 
            dangerouslySetInnerHTML={{ __html: lesson.content || '<p class="italic text-slate-500">Chưa có nội dung văn bản cho bài giảng này.</p>' }} 
          />
        </div>
      </main>
    </div>
  );
};

export default LessonViewer;
