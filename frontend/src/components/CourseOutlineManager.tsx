import React, { useState, useEffect } from 'react';
import { classService, teacherService } from '../services/api';
import { BookOpen, Folder, Plus, Trash2, Edit, CheckCircle, Lock, Unlock, FileText, Settings, Key, FileUp, Sparkles, X } from 'lucide-react';
import { LessonDocumentManager } from './LessonDocumentManager';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface CourseOutlineManagerProps {
  classId: string;
}

export const CourseOutlineManager: React.FC<CourseOutlineManagerProps> = ({ classId }) => {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState<string | null>(null); // chapterId
  const [showTestModal, setShowTestModal] = useState<string | null>(null); // chapterId
  const [selectedLessonForDocs, setSelectedLessonForDocs] = useState<{id: string, title: string} | null>(null);

  // Forms
  const [chapterForm, setChapterForm] = useState({ chapter_name: '', order_idx: 1, description: '' });
  const [lessonForm, setLessonForm] = useState({ title: '', order_idx: 1 });
  const [testForm, setTestForm] = useState({ test_name: '', title: '', pass_score: 5, questions: [] as any[] });
  
  // AI Generation State
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    fetchOutline();
  }, [classId]);

  const fetchOutline = async () => {
    try {
      setLoading(true);
      const data = await classService.getCourseOutline(classId);
      setChapters(data?.chapters || []);
    } catch (err) {
      console.error(err);
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChapter = async () => {
    try {
      await classService.createChapter(chapterForm.chapter_name, classId, chapterForm.order_idx, chapterForm.description);
      setShowChapterModal(false);
      setChapterForm({ chapter_name: '', order_idx: chapters.length + 2, description: '' });
      fetchOutline();
    } catch (err) {
      alert('Lỗi tạo chương');
    }
  };

  const handleCreateLesson = async (chapterId: string) => {
    try {
      await classService.createLesson(lessonForm.title, classId, chapterId, '', '', lessonForm.order_idx);
      setShowLessonModal(null);
      setLessonForm({ title: '', order_idx: 1 });
      fetchOutline();
    } catch (err: any) {
      console.error('CREATE LESSON ERROR:', err);
      console.error('Response data:', err?.response?.data);
      console.error('Response status:', err?.response?.status);
      const serverMsg = err?.response?.data?.exc || err?.response?.data?._server_messages || err?.response?.data?.message || err?.message || 'Unknown error';
      alert('Lỗi tạo bài học: ' + JSON.stringify(serverMsg));
    }
  };

  const handleCreateTest = async (chapterId: string) => {
    if (!testForm.title.trim()) {
      alert('Vui lòng nhập tên bài kiểm tra!');
      return;
    }
    if (testForm.questions.length === 0) {
      alert('Vui lòng thêm ít nhất một câu hỏi!');
      return;
    }
    try {
      if (testForm.test_name) {
        await classService.updateChapterTest(testForm.test_name, testForm.title, testForm.pass_score, testForm.questions);
      } else {
        await classService.createChapterTest(testForm.title, chapterId, testForm.pass_score, testForm.questions);
      }
      setShowTestModal(null);
      setTestForm({ test_name: '', title: '', pass_score: 5, questions: [] });
      setShowAIGenerator(false);
      fetchOutline();
    } catch (err: any) {
      console.error(err);
      const serverMsg = err?.response?.data?.exc || err?.response?.data?._server_messages || err?.response?.data?.message || err?.message || 'Unknown error';
      alert('Lỗi lưu bài kiểm tra: ' + JSON.stringify(serverMsg));
    }
  };

  const handleDeleteTest = async (testName: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này?')) return;
    try {
      await classService.deleteChapterTest(testName);
      fetchOutline();
    } catch (err) {
      alert('Lỗi xóa bài kiểm tra');
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt) {
      alert('Vui lòng nhập chủ đề cho bài test');
      return;
    }
    try {
      setIsGeneratingAI(true);
      const res = await teacherService.generateMockExam(aiPrompt, aiNumQuestions, null);
      if (res.success && res.data) {
        const formattedQuestions = res.data.map((q: any) => ({
          question_text: q.question_text || q.question || '',
          option_a: q.option_a || q.A || '',
          option_b: q.option_b || q.B || '',
          option_c: q.option_c || q.C || '',
          option_d: q.option_d || q.D || '',
          correct_option: q.correct_option || q.correct_answer || q.answer || 'A'
        }));
        setTestForm({
          ...testForm,
          questions: [...testForm.questions, ...formattedQuestions]
        });
        setShowAIGenerator(false);
        setAiPrompt('');
      } else {
        alert(res.message || 'Lỗi sinh câu hỏi AI');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addQuestion = () => {
    setTestForm({
      ...testForm,
      questions: [
        ...testForm.questions,
        {
          question_text: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_option: 'A'
        }
      ]
    });
  };

  const updateQuestion = (index: number, field: string, value: string) => {
    const newQs = [...testForm.questions];
    newQs[index] = { ...newQs[index], [field]: value };
    setTestForm({ ...testForm, questions: newQs });
  };

  const removeQuestion = (index: number) => {
    const newQs = [...testForm.questions];
    newQs.splice(index, 1);
    setTestForm({ ...testForm, questions: newQs });
  };

  const handleDeleteChapter = async (chapterName: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chương này?')) return;
    try {
      await classService.deleteChapter(chapterName);
      fetchOutline();
    } catch (err) {
      alert('Lỗi xóa chương. Có thể do chương vẫn còn bài học bên trong.');
    }
  };

  const handleDeleteLesson = async (lessonName: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài học này?')) return;
    try {
      await classService.deleteLesson(lessonName);
      fetchOutline();
    } catch (err) {
      alert('Lỗi xóa bài học');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải Lộ trình học...</div>;

  return (
    <div className="h-full bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6 overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
            <BookOpen className="mr-2 text-indigo-500" size={24} /> Lộ Trình Học Thuật
          </h3>
          <p className="text-sm text-slate-500 mt-1">Sắp xếp bài giảng và thiết lập bài kiểm tra mở khóa</p>
        </div>
        <button onClick={() => setShowChapterModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center shadow-lg shadow-indigo-500/20">
          <Plus size={16} className="mr-2" /> Thêm Chương Mới
        </button>
      </div>

      <div className="space-y-6">
        {chapters.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500">
            Chưa có lộ trình nào. Hãy bắt đầu bằng cách tạo chương đầu tiên!
          </div>
        ) : (
          chapters.map((chap) => (
            <div key={chap.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">
                    {chap.order_idx}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{chap.chapter_name}</h4>
                    {chap.description && <p className="text-xs text-slate-500">{chap.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowLessonModal(chap.id)} className="bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center">
                    <Plus size={14} className="mr-1" /> Thêm Bài
                  </button>
                  {!chap.test && (
                    <button onClick={() => {
                      setTestForm({ test_name: '', title: '', pass_score: 5, questions: [] });
                      setShowTestModal(chap.id);
                    }} className="bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center">
                      <Plus size={16} className="mr-1.5" /> Tạo Bài Kiểm Tra Mở Khóa
                    </button>
                  )}
                  <button onClick={() => handleDeleteChapter(chap.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {chap.lessons && chap.lessons.length > 0 ? (
                  chap.lessons.map((lesson: any) => (
                    <div key={lesson.name} className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition">
                      <div className="flex items-center">
                        <FileText size={16} className="text-blue-500 mr-3" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Bài {lesson.order_idx}: {lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedLessonForDocs({id: lesson.name, title: lesson.title})} className="flex items-center text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-md transition">
                          <FileUp size={14} className="mr-1.5" /> Quản lý Tài Liệu
                        </button>
                        <button onClick={() => handleDeleteLesson(lesson.name)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic px-2">Chưa có bài học nào trong chương này.</p>
                )}

                {chap.test && (
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg flex justify-between items-center group">
                    <div className="flex items-center">
                      <Lock size={16} className="text-orange-500 mr-3" />
                      <div>
                        <span className="text-orange-800 dark:text-orange-400 font-bold block">{chap.test.title}</span>
                        <span className="text-xs text-orange-600/70 dark:text-orange-500/70">Cần {chap.test.pass_score} điểm để qua chương</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTestForm({
                            test_name: chap.test.name,
                            title: chap.test.title,
                            pass_score: chap.test.pass_score,
                            questions: chap.test.questions || []
                          });
                          setShowTestModal(chap.id);
                        }} 
                        className="text-xs font-bold text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 px-3 py-1.5 rounded-lg transition"
                      >
                        Sửa khóa
                      </button>
                      <button onClick={() => handleDeleteTest(chap.test.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tạo Chương Mới</h3>
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Tên chương (VD: Chương 1: Hàm số)" value={chapterForm.chapter_name} onChange={e => setChapterForm({...chapterForm, chapter_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <input type="number" placeholder="Thứ tự (Order)" value={chapterForm.order_idx} onChange={e => setChapterForm({...chapterForm, order_idx: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <textarea placeholder="Mô tả ngắn gọn" value={chapterForm.description} onChange={e => setChapterForm({...chapterForm, description: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateChapter} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold">Lưu</button>
              <button onClick={() => setShowChapterModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tạo Bài Học Mới</h3>
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Tên bài học" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <input type="number" placeholder="Thứ tự (Order)" value={lessonForm.order_idx} onChange={e => setLessonForm({...lessonForm, order_idx: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCreateLesson(showLessonModal)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold">Lưu</button>
              <button onClick={() => setShowLessonModal(null)} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal (Comprehensive) */}
      {showTestModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0 rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <CheckCircle className="mr-2 text-emerald-500" /> Tạo Bài Kiểm Tra Mở Khóa
              </h3>
              <button onClick={() => setShowTestModal(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/20 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tên bài kiểm tra</label>
                  <input type="text" placeholder="VD: Test cuối chương 1" value={testForm.title} onChange={e => setTestForm({...testForm, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Điểm qua môn (thang điểm 10)</label>
                  <input type="number" min="0" max="10" step="1" value={testForm.pass_score} onChange={e => setTestForm({...testForm, pass_score: parseInt(e.target.value) || 5})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Danh sách câu hỏi ({testForm.questions.length})</h4>
                <div className="flex gap-2">
                  <button onClick={() => setShowAIGenerator(!showAIGenerator)} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center">
                    <Sparkles size={16} className="mr-1.5" /> Tạo bằng AI
                  </button>
                  <button onClick={addQuestion} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center">
                    <Plus size={16} className="mr-1.5" /> Thêm thủ công
                  </button>
                </div>
              </div>

              {showAIGenerator && (
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 shadow-sm">
                  <h5 className="font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center"><Sparkles size={16} className="mr-2" /> AI Sinh Câu Hỏi Trắc Nghiệm</h5>
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Nhập chủ đề (VD: Kiến thức về hàm số bậc 2, định lý Vi-et...)" 
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <input 
                      type="number" 
                      title="Số lượng câu hỏi"
                      value={aiNumQuestions}
                      onChange={e => setAiNumQuestions(parseInt(e.target.value) || 5)}
                      className="w-24 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500 text-center"
                    />
                    <button 
                      onClick={handleGenerateAI} 
                      disabled={isGeneratingAI}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg font-bold transition flex items-center disabled:opacity-50"
                    >
                      {isGeneratingAI ? 'Đang tạo...' : 'Tạo ngay'}
                    </button>
                  </div>
                </div>
              )}

              {testForm.questions.length === 0 ? (
                <div className="text-center p-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500">
                  Chưa có câu hỏi nào. Hãy thêm thủ công hoặc dùng AI.
                </div>
              ) : (
                <div className="space-y-4">
                  {testForm.questions.map((q, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm relative group">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => removeQuestion(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="mb-3 pr-8">
                        <div className="flex justify-between items-end mb-1">
                          <label className="block text-xs font-bold text-slate-500">Câu hỏi {idx + 1}</label>
                          {q.question_text?.includes('$') && (
                            <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">Có định dạng Toán học</span>
                          )}
                        </div>
                        <textarea 
                          value={q.question_text} 
                          onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                          placeholder="Nhập nội dung câu hỏi..."
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white"
                          rows={2}
                        />
                        {q.question_text?.includes('$') && (
                          <div className="mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 shadow-inner">
                            <span className="text-xs font-bold text-slate-400 block mb-1">Xem trước hiển thị:</span>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {q.question_text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const optValue = q[`option_${opt.toLowerCase()}` as keyof typeof q] as string;
                          const hasMath = optValue?.includes('$');
                          return (
                            <div key={opt} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="radio" 
                                  name={`correct_${idx}`} 
                                  checked={q.correct_option === opt}
                                  onChange={() => updateQuestion(idx, 'correct_option', opt)}
                                  className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 mt-0.5"
                                />
                                <span className="font-bold text-sm text-slate-500">{opt}.</span>
                                <input 
                                  type="text" 
                                  value={optValue} 
                                  onChange={(e) => updateQuestion(idx, `option_${opt.toLowerCase()}`, e.target.value)}
                                  placeholder={`Đáp án ${opt}`}
                                  className={`flex-1 bg-slate-50 dark:bg-slate-900 border rounded-lg p-2 text-sm ${q.correct_option === opt ? 'border-emerald-500 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'}`}
                                />
                              </div>
                              {hasMath && (
                                <div className="ml-8 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-md text-sm text-slate-700 dark:text-slate-300">
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                      {optValue}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0 flex justify-end gap-3 rounded-b-xl">
              <button onClick={() => setShowTestModal(null)} className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-bold transition">
                Hủy
              </button>
              <button onClick={() => handleCreateTest(showTestModal)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition shadow-lg shadow-emerald-500/20 flex items-center">
                <CheckCircle size={18} className="mr-2" /> Lưu Bài Kiểm Tra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Document Manager Overlay */}
      {selectedLessonForDocs && (
        <LessonDocumentManager 
          classId={classId} 
          lessonId={selectedLessonForDocs.id} 
          lessonTitle={selectedLessonForDocs.title}
          onClose={() => setSelectedLessonForDocs(null)} 
        />
      )}
    </div>
  );
};
