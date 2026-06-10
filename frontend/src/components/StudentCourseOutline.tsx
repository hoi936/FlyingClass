import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { classService } from '../services/api';
import { BookOpen, Folder, Lock, Unlock, CheckCircle, PlayCircle, FileText, ChevronDown, ChevronRight, Check, Link as LinkIcon, FileUp } from 'lucide-react';
import { LessonDocumentManager } from './LessonDocumentManager';
import { useAuthStore } from '../store/useAuthStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface StudentCourseOutlineProps {
  classId: string;
}

export const StudentCourseOutline: React.FC<StudentCourseOutlineProps> = ({ classId }) => {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChaps, setExpandedChaps] = useState<string[]>([]);
  const [selectedLessonForDocs, setSelectedLessonForDocs] = useState<{id: string, title: string} | null>(null);
  
  // Test taking state
  const [takingTest, setTakingTest] = useState<any>(null); // The test object
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  
  const user = useAuthStore(state => state.user);
  const [cheatWarnings, setCheatWarnings] = useState(0);

  useEffect(() => {
    let visibilityHandler: any;
    let contextMenuHandler: any;
    let keyDownHandler: any;
    let copyHandler: any;
    let cutHandler: any;
    let beforePrintHandler: any;
    let beforeUnloadHandler: any;
    
    if (takingTest && !testResult) {
      // Enter fullscreen
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      
      // Block tab switch / window hide
      visibilityHandler = () => {
        if (document.hidden) {
          setCheatWarnings(prev => {
            const nw = prev + 1;
            alert(`⚠️ CẢNH BÁO VI PHẠM (${nw}): Bạn không được phép chuyển tab hoặc ẩn cửa sổ trong khi làm bài!`);
            return nw;
          });
        }
      };
      
      // Block right-click
      contextMenuHandler = (e: MouseEvent) => {
        e.preventDefault();
      };
      
      // Block ALL keyboard input
      keyDownHandler = (e: KeyboardEvent) => {
        e.preventDefault();
        
        // Specifically count PrintScreen as a violation, even though it's blocked
        if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
          setCheatWarnings(prev => {
            const nw = prev + 1;
            alert(`⚠️ CẢNH BÁO VI PHẠM (${nw}): Chụp ảnh màn hình bị cấm trong khi làm bài!`);
            return nw;
          });
        }
      };

      // Block copy event
      copyHandler = (e: ClipboardEvent) => {
        e.preventDefault();
      };

      // Block cut event
      cutHandler = (e: ClipboardEvent) => {
        e.preventDefault();
      };

      // Block print
      beforePrintHandler = () => {
        alert('⚠️ In ấn bị chặn trong khi làm bài!');
        window.stop();
      };

      // Block tab closing/refreshing
      beforeUnloadHandler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = ''; // Required for modern browsers to show the default warning
        return '';
      };

      document.addEventListener('visibilitychange', visibilityHandler);
      document.addEventListener('contextmenu', contextMenuHandler);
      document.addEventListener('keydown', keyDownHandler, { capture: true });
      document.addEventListener('copy', copyHandler);
      document.addEventListener('cut', cutHandler);
      window.addEventListener('beforeprint', beforePrintHandler);
      window.addEventListener('beforeunload', beforeUnloadHandler);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setCheatWarnings(0);
    }

    return () => {
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if (contextMenuHandler) document.removeEventListener('contextmenu', contextMenuHandler);
      if (keyDownHandler) document.removeEventListener('keydown', keyDownHandler, { capture: true });
      if (copyHandler) document.removeEventListener('copy', copyHandler);
      if (cutHandler) document.removeEventListener('cut', cutHandler);
      if (beforePrintHandler) window.removeEventListener('beforeprint', beforePrintHandler);
      if (beforeUnloadHandler) window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }, [takingTest, testResult]);

  useEffect(() => {
    fetchOutline();
  }, [classId]);

  const fetchOutline = async () => {
    try {
      setLoading(true);
      const data = await classService.getCourseOutline(classId);
      if (data && data.chapters) {
        setChapters(data.chapters);
        // Expand unlocked chapters by default
        const unlocked = data.chapters.filter((c: any) => !c.is_locked).map((c: any) => c.id);
        setExpandedChaps(unlocked);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string, isLocked: boolean) => {
    if (isLocked) return;
    setExpandedChaps(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const startTest = (test: any) => {
    setTakingTest(test);
    setAnswers({});
    setTestResult(null);
  };

  const handleSubmitTest = async () => {
    if (!takingTest) return;
    try {
      const res = await classService.submitChapterTest(takingTest.name, answers);
      setTestResult(res);
      if (cheatWarnings > 0) {
        localStorage.setItem(`fc_violation_${takingTest.name}`, cheatWarnings.toString());
      }
    } catch (err: any) {
      alert('Có lỗi xảy ra khi nộp bài: ' + err.message);
    }
  };

  const handleCloseTest = () => {
    setTakingTest(null);
    setTestResult(null);
    fetchOutline(); // Refresh outline to reflect new unlocks
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải Lộ trình học...</div>;

  return (
    <div className="h-full bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6 overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
          <BookOpen className="mr-2 text-indigo-500" size={24} /> Lộ Trình Bài Giảng
        </h3>
        <p className="text-sm text-slate-500 mt-1">Hoàn thành bài kiểm tra cuối chương để mở khóa chương tiếp theo</p>
      </div>

      <div className="space-y-4">
        {chapters.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500">
            Chưa có lộ trình nào được giáo viên thiết lập.
          </div>
        ) : (
          chapters.map((chap, idx) => {
            const isExpanded = expandedChaps.includes(chap.id);
            const isLocked = chap.is_locked;
            
            return (
              <div key={chap.id} className={`border rounded-xl overflow-hidden transition ${isLocked ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 shadow-sm'}`}>
                {/* Header */}
                <div 
                  className={`p-4 flex justify-between items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  onClick={() => toggleExpand(chap.id, isLocked)}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 ${isLocked ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                      {chap.order_idx}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg flex items-center">
                        {chap.chapter_name}
                        {chap.passed ? <CheckCircle size={16} className="text-emerald-500 ml-2" /> : null}
                      </h4>
                      {chap.description && <p className="text-xs text-slate-500">{chap.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center text-slate-400">
                    {isLocked ? (
                      <Lock size={20} className="text-slate-400" />
                    ) : (
                      isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />
                    )}
                  </div>
                </div>

                {/* Content */}
                {!isLocked && isExpanded && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
                    {chap.lessons && chap.lessons.length > 0 ? (
                      chap.lessons.map((lesson: any) => (
                        <div key={lesson.name} className="flex flex-col p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <FileText size={18} className="text-indigo-500 mr-3" />
                              <span className="text-slate-700 dark:text-slate-300 font-bold">Bài {lesson.order_idx}: {lesson.title}</span>
                            </div>
                            <button onClick={() => setSelectedLessonForDocs({id: lesson.name, title: lesson.title})} className="flex items-center text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-md transition shadow-sm">
                              <Folder size={14} className="mr-1.5" /> Xem Tài Liệu
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic px-2">Chưa có bài học.</p>
                    )}

                    {chap.test && (
                      <div className={`mt-4 p-4 rounded-lg border flex justify-between items-center ${chap.passed ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'}`}>
                        <div className="flex items-center">
                          {chap.passed ? <Unlock size={18} className="text-emerald-500 mr-3" /> : <Lock size={18} className="text-orange-500 mr-3" />}
                          <div>
                            <span className={`font-bold block ${chap.passed ? 'text-emerald-800 dark:text-emerald-400' : 'text-orange-800 dark:text-orange-400'}`}>
                              Bài Test: {chap.test.title}
                            </span>
                            <span className={`text-xs ${chap.passed ? 'text-emerald-600/70' : 'text-orange-600/70'}`}>
                              Cần đạt {chap.test.pass_score} điểm để qua chương
                              {chap.score !== null && ` - Điểm cao nhất của bạn: ${(chap.score || 0).toFixed(1)}/10`}
                            </span>
                          </div>
                        </div>
                        <div>
                          {chap.passed ? (
                            <button onClick={() => startTest(chap.test)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center">
                              <Check size={14} className="mr-1" /> Đã Đạt (Làm lại)
                            </button>
                          ) : (
                            <button onClick={() => startTest(chap.test)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition flex items-center">
                              <PlayCircle size={14} className="mr-1" /> Bắt đầu Test
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Test Taking Modal */}
      {takingTest && createPortal(
        <div 
          className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden animate-fade-in"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
        >
          {/* Diagonal watermark overlay - covers entire screen */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              pointerEvents: 'none',
              overflow: 'hidden',
              opacity: 0.07,
            }}
          >
            {Array.from({ length: 20 }).map((_, row) => (
              <div
                key={row}
                style={{
                  position: 'absolute',
                  top: `${row * 120 - 200}px`,
                  left: '-200px',
                  right: '-200px',
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#000',
                  transform: 'rotate(-30deg)',
                  transformOrigin: 'center',
                  letterSpacing: '2px',
                  lineHeight: '60px',
                }}
              >
                {Array(60).fill(`${user?.full_name || ''} • ${user?.email || ''} • ${new Date().toLocaleDateString('vi-VN')}`).join('   ')}
              </div>
            ))}
          </div>

          {!testResult && (
            <div className="bg-red-600 text-white text-center text-xs md:text-sm font-bold py-2 px-4 flex items-center justify-center gap-3 flex-wrap" style={{ position: 'relative', zIndex: 201 }}>
              <span className="animate-pulse">🔒</span>
              <span>PHÒNG THI — Bạn KHÔNG được phép chuyển tab, sao chép, chụp ảnh màn hình hoặc thoát ra ngoài. Mỗi vi phạm sẽ bị ghi nhận!</span>
              <span className="animate-pulse">🔒</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-none border-b border-slate-200 dark:border-slate-700 shadow-md w-full max-h-full flex flex-col overflow-hidden relative z-10 flex-1">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{takingTest.title}</h3>
                <p className="text-xs text-slate-500">Hãy chọn đáp án đúng cho các câu hỏi sau.</p>
              </div>
              <div className="flex items-center gap-4">
                {!testResult && cheatWarnings > 0 && (
                  <div className="px-3 py-1 rounded-lg font-bold text-sm bg-red-600/20 text-red-400 border border-red-500/50 animate-pulse whitespace-nowrap">
                    ⚠️ Vi phạm: {cheatWarnings} lần
                  </div>
                )}
                {!testResult && (
                  <button onClick={() => setTakingTest(null)} className="text-slate-500 hover:text-red-500 px-3 py-1 rounded-lg transition-colors border border-transparent hover:border-red-500/30">Thoát Bài Thi</button>
                )}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6 bg-slate-50/50 dark:bg-slate-900/50">
              {testResult ? (
                <div className="text-center py-8">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${testResult.is_passed ? 'bg-emerald-100 text-emerald-500' : 'bg-red-100 text-red-500'}`}>
                    {testResult.is_passed ? <CheckCircle size={40} /> : <Lock size={40} />}
                  </div>
                  <h2 className={`text-2xl font-bold mb-2 ${testResult.is_passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {testResult.is_passed ? 'Chúc mừng! Bạn đã qua bài.' : 'Rất tiếc! Chưa đạt.'}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
                    Điểm của bạn: <span className="font-bold text-slate-900 dark:text-white">{testResult.score.toFixed(1)}/10</span> <br/>
                    ({testResult.correct_count}/{testResult.total_questions} câu)
                  </p>
                  <button onClick={handleCloseTest} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg">
                    Quay Lại Lộ Trình
                  </button>
                </div>
              ) : (
                takingTest.questions && takingTest.questions.length > 0 ? (
                  takingTest.questions.map((q: any, idx: number) => (
                    <div key={q.name} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative z-10 max-w-4xl mx-auto w-full">
                      <div className="font-medium text-slate-900 dark:text-white mb-4 text-lg flex items-start">
                        <span className="text-blue-400 mr-2 font-bold whitespace-nowrap">Câu {idx + 1}:</span>
                        <div className="inline-block prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {q.question_text || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="space-y-3 pl-0 md:pl-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['a', 'b', 'c', 'd'].map(opt => {
                          const optText = q[`option_${opt}`];
                          if (!optText) return null;
                          const isSelected = answers[q.name] === opt;
                          return (
                            <label key={opt} className={`flex items-start p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-slate-500 hover:bg-white dark:bg-slate-800'}`}>
                              <input 
                                type="radio" 
                                name={q.name} 
                                value={opt} 
                                checked={isSelected}
                                onChange={(e) => setAnswers({...answers, [q.name]: e.target.value})}
                                className="mt-1 mr-3 text-blue-600 focus:ring-blue-500 opacity-0 absolute"
                              />
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500 text-slate-900 dark:text-white' : 'border-slate-500 text-transparent'}`}>
                                <Check size={14} className={isSelected ? "block" : "hidden"} />
                              </div>
                              <div className="text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                  {optText || ''}
                                </ReactMarkdown>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 py-8">Chưa có câu hỏi nào trong bài test này.</p>
                )
              )}
            </div>

            {!testResult && (
              <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-10 shrink-0">
                <button 
                  onClick={handleSubmitTest} 
                  disabled={!takingTest.questions || Object.keys(answers).length < takingTest.questions.length}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition shadow-lg"
                >
                  Nộp Bài
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Lesson Document Manager Overlay for Students */}
      {selectedLessonForDocs && (
        <LessonDocumentManager 
          classId={classId} 
          lessonId={selectedLessonForDocs.id} 
          lessonTitle={selectedLessonForDocs.title}
          onClose={() => setSelectedLessonForDocs(null)} 
          isReadOnly={true}
        />
      )}
    </div>
  );
};
