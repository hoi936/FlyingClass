import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { studentService, classService, api, teacherRatingService } from '../services/api';
import { useSessionState } from '../hooks/useSessionState';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { 
  ChevronLeft, MessageSquare, Folder, Users, Link as LinkIcon, Send, Key, Image as ImageIcon, Star, CreditCard, Award, PlayCircle, Clock, LogOut, Sun, Moon, Eye, EyeOff, BookOpen,
  LayoutDashboard, FileText, Bell, User, TrendingUp, Sparkles, Bot
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { StudentCourseOutline } from '../components/StudentCourseOutline';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MultiSelectDropdown = ({ options, selected, onChange, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-between min-w-[160px] shadow-sm hover:border-blue-400 transition"
      >
        <span className="truncate mr-2 max-w-[120px]">
          {selected.length === 0 
            ? placeholder 
            : `${selected.length} lớp đã chọn`}
        </span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-50 right-0 md:left-0 md:right-auto mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1.5 max-h-60 overflow-auto animate-fade-in origin-top">
          <div 
            className="px-3 py-2 text-sm flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700/50 mb-1"
            onClick={() => { onChange([]); setIsOpen(false); }}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${selected.length === 0 ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
              {selected.length === 0 && <span className="text-white text-[10px]">✓</span>}
            </div>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">Tất cả lớp học</span>
          </div>
          {options.map((opt: any) => {
            const isChecked = selected.includes(opt.value);
            return (
              <div 
                key={opt.value}
                className="px-3 py-2 text-sm flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                onClick={() => {
                  if (isChecked) {
                    onChange(selected.filter((v: any) => v !== opt.value));
                  } else {
                    onChange([...selected, opt.value]);
                  }
                }}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${isChecked ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                  {isChecked && <span className="text-white text-[10px]">✓</span>}
                </div>
                <span className="text-slate-700 dark:text-slate-300 truncate">{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [activeMenu, setActiveMenu] = useSessionState('studentActiveMenu', 'dashboard');
  const [loading, setLoading] = useState(true);

  // Overview Data
  const [overview, setOverview] = useState<any>(null);

  // Dashboard Data (Notifications & Upcoming Exams)
  const [dashData, setDashData] = useState<any>(null);

  // Classes Data
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useSessionState<any>('studentSelectedClass', null);
  const [classDetailTab, setClassDetailTab] = useSessionState('studentClassDetailTab', 'chat'); // chat, documents, members

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Documents & Members State
  const [documents, setDocuments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Exam State
  const [examResults, setExamResults] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [selectedClassFilters, setSelectedClassFilters] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null); // For taking exam
  const [examDetails, setExamDetails] = useState<any>(null);
  const [examAnswers, setExamAnswers] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examScoreResult, setExamScoreResult] = useState<any>(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [examStartTime, setExamStartTime] = useState<string | null>(null);

  // AI Mock States
  const [aiMockPrompt, setAiMockPrompt] = useState('');
  const [aiMockCount, setAiMockCount] = useState(5);
  const [aiMockQuestions, setAiMockQuestions] = useState<any[]>([]);
  const [aiMockLoading, setAiMockLoading] = useState(false);
  const [aiMockActive, setAiMockActive] = useState(false);
  const [aiMockAnswers, setAiMockAnswers] = useState<Record<string, string>>({});
  const [aiMockTimeLeft, setAiMockTimeLeft] = useState(0);
  const [aiMockScore, setAiMockScore] = useState<any>(null);
  const aiMockTimerRef = useRef<any>(null);

  // Document Chat States
  const [showDocChat, setShowDocChat] = useState(false);
  const [docChatMessages, setDocChatMessages] = useState<any[]>([]);
  const [docChatInput, setDocChatInput] = useState('');
  const [docChatLoading, setDocChatLoading] = useState(false);
  const docChatEndRef = useRef<HTMLDivElement>(null);

  // Hidden Exams State
  const [hiddenExamIds, setHiddenExamIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('fc_hidden_exams');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [showHiddenExams, setShowHiddenExams] = useState(false);

  useEffect(() => {
    localStorage.setItem('fc_hidden_exams', JSON.stringify(hiddenExamIds));
  }, [hiddenExamIds]);

  const toggleHideExam = (examId: string) => {
    setHiddenExamIds(prev => prev.includes(examId) ? prev.filter(id => id !== examId) : [...prev, examId]);
  };

  // Profile State
  const [profileData, setProfileData] = useState({ 
    full_name: user?.full_name || '', 
    mobile_no: user?.mobile_no || '', 
    dob: user?.dob || '', 
    new_password: '',
    confirm_password: ''
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.user_image || null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [teacherProfileModal, setTeacherProfileModal] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState<any>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [teacherProfileData, setTeacherProfileData] = useState<any>(null);

  useEffect(() => {
    if (teacherProfileModal?.teacher_name) {
      import('../services/api').then(({ teacherRatingService }) => {
        setTeacherProfileData(teacherRatingService.getTeacherRatingDetails(teacherProfileModal.teacher_name));
      });
    }
  }, [teacherProfileModal]);
  
  // FC Floating QA Chatbot States
  const [fcAiChatOpen, setFcAiChatOpen] = useState(false);
  const [fcAiMessages, setFcAiMessages] = useState<any[]>([]);
  const [fcAiInput, setFcAiInput] = useState('');
  const [fcAiLoading, setFcAiLoading] = useState(false);
  const [fcAiUsedTokens, setFcAiUsedTokens] = useState(0);
  const fcAiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overview && overview.used_tokens !== undefined) {
      setFcAiUsedTokens(overview.used_tokens);
    }
  }, [overview]);

  useEffect(() => {
    if (fcAiEndRef.current) {
      fcAiEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [fcAiMessages, fcAiLoading]);
  
  // Refresher
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchOverview();
    fetchDashData();
    fetchMyClasses();
    fetchExamResults();
    setLoading(false);
    
    // Poll for notifications
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
      fetchDashData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchExamResults();
  }, [chartFilter]);

  useEffect(() => {
    let visibilityHandler: any;
    let contextMenuHandler: any;
    let keyDownHandler: any;
    let copyHandler: any;
    let cutHandler: any;
    let beforePrintHandler: any;
    let beforeUnloadHandler: any;
    
    if (selectedExam && !examScoreResult) {
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
  }, [selectedExam, examScoreResult]);

  // Polling for Chat
  useEffect(() => {
    let interval: any;
    if (selectedClass && classDetailTab === 'chat') {
      fetchChatMessages();
      interval = setInterval(fetchChatMessages, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedClass, classDetailTab]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (classDetailTab === 'chat') {
      setTimeout(scrollToBottom, 50);
    }
  }, [chatMessages, classDetailTab]);

  // Exam Timer
  useEffect(() => {
    let timer: any;
    if (selectedExam && timeLeft > 0 && !examScoreResult) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && selectedExam && !examScoreResult) {
      handleSubmitExam();
    }
    return () => clearInterval(timer);
  }, [selectedExam, timeLeft, examScoreResult]);

  const fetchOverview = async () => {
    try {
      const data = await studentService.getOverview();
      setOverview(data);
    } catch(err) { console.error(err); }
  };

  const fetchDashData = async () => {
    try {
      const data = await studentService.getDashboardData();
      setDashData(data);
    } catch(err) { console.error(err); }
  };

  const handleNotificationClick = async (n: any) => {
    // Mark as read immediately in UI for responsive feel
    if (!n.read) {
      setDashData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.map((notif: any) =>
            notif.name === n.name ? { ...notif, read: 1 } : notif
          )
        };
      });
      try {
        await studentService.markNotificationRead(n.name);
      } catch (err) {
        console.error("Lỗi khi đánh dấu đã đọc thông báo", err);
      }
    }

    // Navigation logic based on document_type and document_name
    const isChat = (n.subject || "").includes("Tin nhắn mới") || (n.subject || "").includes("nhắn");
    const isExam = (n.subject || "").includes("Bài thi mới") || (n.subject || "").includes("kiểm tra");
    const isJoinClass = (n.subject || "").includes("Tham gia thành công") || (n.subject || "").includes("thêm vào lớp");

    if (isChat || isJoinClass) {
      const classId = n.document_name;
      if (classId) {
        const foundClass = myClasses.find((c: any) => (c.class_id === classId || c.id === classId));
        if (foundClass) {
          setSelectedClass(foundClass);
        } else {
          // Fallback if not loaded in myClasses yet
          setSelectedClass({
            class_id: classId,
            id: classId,
            class_name: (n.subject || "").split(':').pop()?.trim() || 'Lớp học',
            status: 'Approved'
          });
        }
        setActiveMenu('classes');
        setClassDetailTab('chat');
      }
    } else if (isExam) {
      setActiveMenu('exams');
      setSelectedClass(null);
    }
  };

  const [learningProgress, setLearningProgress] = useState<Record<string, any>>({});

  const fetchMyClasses = async () => {
    try {
      const data = await classService.getMyClasses();
      const classes = data.classes || [];
      setMyClasses(classes);
      
      const progressMap: Record<string, any> = {};
      await Promise.all(classes.map(async (c: any) => {
        try {
          const classId = c.class_id || c.id;
          const prog = await classService.getStudentLearningProgress(classId);
          progressMap[classId] = prog;
        } catch(e) {}
      }));
      setLearningProgress(progressMap);
    } catch(err) { console.error(err); }
  };

  const fetchExamResults = async () => {
    try {
      const data = await studentService.getExamResults(chartFilter);
      setExamResults(data.message || []);
    } catch(err) { console.error(err); }
  };

  const fetchChatMessages = async () => {
    if (!selectedClass) return;
    try {
      const data = await classService.getChatMessages(selectedClass.class_id || selectedClass.id);
      setChatMessages(data.messages || []);
    } catch(err) { console.error(err); }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !selectedClass) return;
    try {
      await classService.sendChatMessage(selectedClass.class_id || selectedClass.id, chatInput);
      setChatInput('');
      fetchChatMessages();
    } catch(err: any) { 
      console.error(err); 
      let errorMsg = err.message || "Lỗi gửi tin nhắn";
      if (err.response?.data?._server_messages) {
        try {
          const messages = JSON.parse(err.response.data._server_messages);
          if (messages.length > 0) {
            const parsedMsg = JSON.parse(messages[0]);
            errorMsg = parsedMsg.message || errorMsg;
          }
        } catch(e) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      setChatMessages(prev => [...prev, {
        sender: 'Hệ thống',
        message: errorMsg,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      }]);
    }
  };

  const fetchDocuments = async () => {
    if (!selectedClass) return;
    try {
      const data = await classService.getClassDocuments(selectedClass.class_id || selectedClass.id, currentFolderId);
      setDocuments(data || []);
    } catch(err) { console.error(err); }
  };

  useEffect(() => {
    if (classDetailTab === 'documents') {
      fetchDocuments();
    }
    if (classDetailTab === 'members') {
      fetchMembers();
    }
  }, [classDetailTab, currentFolderId]);

  const fetchMembers = async () => {
    if (!selectedClass) return;
    try {
      const data = await classService.getClassStudents(selectedClass.class_id || selectedClass.id);
      setMembers(data.students || []);
    } catch(err) { console.error(err); }
  };

  const joinClassByCode = async (defaultCode?: string, bypassPrompt = false) => {
    let code = defaultCode || "";
    if (!bypassPrompt || !code) {
      code = prompt("Nhập mã tham gia lớp học:", code) || "";
    }
    if (!code) return;
    try {
      await classService.joinClass(code);
      alert("Tham gia lớp thành công!");
      fetchOverview();
      fetchDashData();
      fetchMyClasses();
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      let errorMsg = "Lỗi tham gia lớp";
      if (err.response?.data?._server_messages) {
        try {
          const messages = JSON.parse(err.response.data._server_messages);
          if (messages.length > 0) {
            const parsedMsg = JSON.parse(messages[0]);
            errorMsg = parsedMsg.message || errorMsg;
          }
        } catch(e) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      alert(errorMsg);
    }
  };

  const leaveCurrentClass = async () => {
    if (!selectedClass) return;
    if (window.confirm("Bạn có chắc chắn muốn thoát khỏi lớp học này? Mọi dữ liệu về điểm số trong lớp có thể bị mất.")) {
      try {
        await classService.leaveClass(selectedClass.class_id || selectedClass.id);
        alert("Đã rời khỏi lớp học thành công!");
        setSelectedClass(null);
        setActiveMenu('classes');
        setRefreshKey(k => k + 1);
      } catch (err: any) {
        alert(err.response?.data?.message || "Lỗi thoát lớp");
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileData.new_password && profileData.new_password !== profileData.confirm_password) {
      alert('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      return;
    }
    if (profileData.new_password && (profileData.new_password.length < 8 || !/[a-zA-Z]/.test(profileData.new_password) || !/\d/.test(profileData.new_password))) {
      alert('Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số.');
      return;
    }
    
    try {
      const res: any = await studentService.updateProfile(
        profileData.full_name,
        undefined,
        profileData.mobile_no,
        profileData.dob,
        undefined, // Removed CCCD
        profileData.new_password,
        avatarData || undefined
      );
      
      if (res && res.success === false) {
        throw new Error(res.message || "Cập nhật thất bại");
      }
      
      alert("Cập nhật hồ sơ thành công!");
      useAuthStore.getState().checkAuth();
      if (profileData.new_password) {
        setProfileData({...profileData, new_password: '', confirm_password: ''});
      }
    } catch(err: any) {
      alert(err.response?.data?.message || "Lỗi cập nhật");
    }
  };

  const handleAvatarChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setAvatarData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startExam = async (exam: any) => {
    try {
      const data = await classService.getClassDetails(exam.class_ref || exam.class_id);
      // Wait, need getExamDetails API, but we might just use classService if it has it, 
      // let's use a direct axios call if classService lacks it.
      const res = await api.get('/api/method/flying_class.flying_class.api.get_exam_details', { params: { exam_id: exam.id } });
      const examData = res.data.message;
      if (examData.success === false) {
         alert(examData.message); return;
      }
      setExamDetails(examData);
      setSelectedExam(exam);
      setExamAnswers({});
      setTimeLeft(examData.exam.duration * 60);
      setExamScoreResult(null);
      setExamStartTime(new Date().toISOString());
    } catch (err: any) {
      alert(err.response?.data?.message || "Không thể tải đề thi");
    }
  };

  const confirmAndStartExam = (exam: any) => {
    if (exam.end_time && new Date(exam.end_time) < new Date()) {
      alert("Đã hết thời gian làm bài thi này!");
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn bắt đầu làm bài thi "${exam.title}" không? Thời gian làm bài sẽ được tính ngay lập tức.`)) {
      startExam(exam);
    }
  };

  const handleSubmitExam = async () => {
    if (!selectedExam) return;
    if (examSubmitting) return;
    setExamSubmitting(true);
    try {
      const res = await classService.submitExam(selectedExam.id, examAnswers, examStartTime || undefined);
      if (res.success) {
        setExamScoreResult(res);
        if (cheatWarnings > 0) {
          localStorage.setItem(`fc_violation_${selectedExam.id}`, cheatWarnings.toString());
        }
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi nộp bài");
    } finally {
      setExamSubmitting(false);
      fetchExamResults();
      fetchDashData();
      setRefreshKey(k => k + 1); // Refresh dashboard to update completed exams
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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

  // AI Mock Functions
  const startAIMockExam = async () => {
    if (!aiMockPrompt.trim()) {
      alert("Vui lòng nhập chủ đề thi thử!");
      return;
    }
    try {
      setAiMockLoading(true);
      setAiMockQuestions([]);
      setAiMockAnswers({});
      setAiMockScore(null);
      
      const res = await api.post('/api/method/flying_class.flying_class.api.generate_ai_exam', {
        prompt: aiMockPrompt,
        num_questions: aiMockCount
      });
      
      if (res.data.message.success === false) {
        alert(res.data.message.message || "Không thể sinh đề thi thử.");
        return;
      }
      
      const questions = res.data.message.data || [];
      if (questions.length === 0) {
        alert("AI không trả về câu hỏi nào. Vui lòng thử lại với chủ đề khác.");
        return;
      }
      
      setAiMockQuestions(questions);
      setAiMockTimeLeft(questions.length * 120); // 2 mins per question
      setAiMockActive(true);
    } catch(err: any) {
      alert(err.response?.data?.message || "Lỗi khi sinh đề thi AI");
    } finally {
      setAiMockLoading(false);
    }
  };

  useEffect(() => {
    if (aiMockActive && aiMockTimeLeft > 0) {
      aiMockTimerRef.current = setInterval(() => {
        setAiMockTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(aiMockTimerRef.current);
            submitAIMockExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(aiMockTimerRef.current);
  }, [aiMockActive, aiMockTimeLeft]);

  const submitAIMockExam = () => {
    clearInterval(aiMockTimerRef.current);
    let correctCount = 0;
    aiMockQuestions.forEach((q, idx) => {
      if (aiMockAnswers[idx] === q.correct_answer) {
        correctCount++;
      }
    });
    const finalScore = (correctCount / aiMockQuestions.length) * 10;
    setAiMockScore({
      score: finalScore,
      correctCount,
      totalCount: aiMockQuestions.length
    });
    setAiMockActive(false);
  };

  // Document Chat Functions
  useEffect(() => {
    setDocChatMessages([]);
    setShowDocChat(false);
    setDocChatInput('');
  }, [selectedDocument]);

  useEffect(() => {
    if (docChatEndRef.current) {
      docChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [docChatMessages, docChatLoading]);

  const handleSendDocChat = async () => {
    if (!docChatInput.trim() || !selectedDocument || docChatLoading) return;
    const userMsg = docChatInput;
    setDocChatInput('');
    setDocChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setDocChatLoading(true);

    try {
      const history = docChatMessages.map(m => ({ role: m.role, text: m.text }));
      const res = await studentService.chatAboutDocument(selectedDocument.id, userMsg, history);
      
      if (res.success === false) {
         setDocChatMessages(prev => [...prev, { role: 'model', text: res.message || "Lỗi xử lý." }]);
      } else {
         setDocChatMessages(prev => [...prev, { role: 'model', text: res.reply }]);
      }
    } catch(err: any) {
      setDocChatMessages(prev => [...prev, { role: 'model', text: "Lỗi kết nối hoặc tài khoản đã hết lượt chat AI." }]);
    } finally {
      setDocChatLoading(false);
    }
  };

  const handleSendFcAiMessage = async () => {
    if (!fcAiInput.trim() || fcAiLoading) return;
    const userMsg = fcAiInput;
    setFcAiInput('');
    setFcAiMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setFcAiLoading(true);

    try {
      const history = fcAiMessages.map(m => ({ role: m.role, text: m.text }));
      const data = await studentService.askFlyingClassAI(userMsg, history);
      
      if (data.success === false) {
        setFcAiMessages(prev => [...prev, { role: 'model', text: data.message || "Đã xảy ra lỗi hệ thống." }]);
      } else {
        setFcAiMessages(prev => [...prev, { role: 'model', text: data.reply }]);
        if (data.total_tokens_used !== undefined) {
          setFcAiUsedTokens(data.total_tokens_used);
        }
      }
    } catch (err: any) {
      let errorMsg = "Có lỗi xảy ra khi kết nối trợ lý AI.";
      if (err.response?.data?._server_messages) {
        try {
          const messages = JSON.parse(err.response.data._server_messages);
          if (messages.length > 0) {
            const parsedMsg = JSON.parse(messages[0]);
            errorMsg = parsedMsg.message || errorMsg;
          }
        } catch(e) {}
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      setFcAiMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
    } finally {
      setFcAiLoading(false);
    }
  };

  const renderAIMockExam = () => {
    if (aiMockLoading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">FlyingClass AI đang soạn đề thi cho bạn...</p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Quá trình này có thể mất đến 30 giây.</p>
        </div>
      );
    }

    if (aiMockActive) {
      return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700 mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">Luyện thi thử với AI</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Chủ đề: {aiMockPrompt}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono bg-slate-50 dark:bg-slate-900 text-emerald-400 font-bold border border-emerald-500/20 px-3 py-1.5 rounded-lg text-lg flex items-center">
                <Clock size={16} className="mr-2" /> {formatTime(aiMockTimeLeft)}
              </span>
              <button onClick={submitAIMockExam} className="bg-indigo-600 hover:bg-indigo-500 text-slate-950 dark:text-white px-5 py-2 rounded-lg font-bold transition">
                Nộp bài tự luyện
              </button>
            </div>
          </div>

          <div className="space-y-8 flex-1 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            {aiMockQuestions.map((q, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-900/55 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                <h4 className="font-medium text-slate-900 dark:text-white text-lg mb-4 flex items-start">
                  <span className="text-indigo-400 font-bold mr-2 whitespace-nowrap">Câu {idx + 1}:</span>
                  <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {q.question_text || ''}
                    </ReactMarkdown>
                  </div>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const optKey = `option_${opt.toLowerCase()}`;
                    const isSelected = aiMockAnswers[idx] === opt;
                    return (
                      <div
                        key={opt}
                        onClick={() => setAiMockAnswers({...aiMockAnswers, [idx]: opt})}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start ${isSelected ? 'bg-indigo-600/20 border-indigo-500 shadow-md text-slate-900 dark:text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-500 text-slate-700 dark:text-slate-300'}`}
                      >
                        <span className="font-bold mr-2">{opt}.</span> 
                        <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {q[optKey] || ''}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (aiMockScore) {
      return (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
          <div className="text-center py-8 border-b border-slate-200 dark:border-slate-700 mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-2xl mb-2">Kết quả tự luyện thi</h3>
            <div className="inline-flex flex-col items-center justify-center bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-full w-32 h-32 mb-4">
              <span className={`text-4xl font-bold ${aiMockScore.score >= 8 ? 'text-emerald-400' : aiMockScore.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {aiMockScore.score.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Thang điểm 10</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400">Trả lời đúng {aiMockScore.correctCount}/{aiMockScore.totalCount} câu hỏi.</p>
            <button onClick={() => { setAiMockScore(null); setAiMockPrompt(''); setAiMockQuestions([]); }} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-slate-950 dark:text-white px-6 py-2 rounded-lg font-bold transition">
              Làm đề khác
            </button>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
            {aiMockQuestions.map((q, idx) => {
              const studentAns = aiMockAnswers[idx];
              const correctAns = q.correct_answer;
              const isCorrect = studentAns === correctAns;

              return (
                <div key={idx} className={`p-6 rounded-xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <h4 className="font-medium text-slate-900 dark:text-white text-lg mb-4 flex items-start gap-2">
                    <span className="text-indigo-400 font-bold whitespace-nowrap">Câu {idx + 1}:</span>
                    <div className="inline-block flex-1 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {q.question_text || ''}
                      </ReactMarkdown>
                    </div>
                    {isCorrect ? (
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Chính xác</span>
                    ) : (
                      <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Sai</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4">
                    {['A', 'B', 'C', 'D'].map(opt => {
                      const optKey = `option_${opt.toLowerCase()}`;
                      const isStudentChoice = studentAns === opt;
                      const isCorrectChoice = correctAns === opt;
                      
                      let style = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';
                      if (isCorrectChoice) {
                        style = 'bg-emerald-500/20 border-emerald-500 text-slate-900 dark:text-white font-medium';
                      } else if (isStudentChoice) {
                        style = 'bg-red-500/20 border-red-500 text-slate-900 dark:text-white';
                      }

                      return (
                        <div key={opt} className={`p-4 rounded-lg border ${style} flex items-start text-sm`}>
                          <span className="font-bold mr-2">{opt}.</span>
                          <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q[optKey] || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in max-w-xl mx-auto py-12">
        <div className="bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-8 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-24 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 p-24 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <Sparkles size={48} className="text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Tự luyện tập đề thi với AI</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">Tạo nhanh đề thi thử trắc nghiệm dựa trên chủ đề tự chọn. Kết quả luyện tập không tính vào điểm lớp học chính thức.</p>
          
          <div className="space-y-4 text-left relative z-10">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">Chủ đề luyện thi</label>
              <input
                type="text"
                placeholder="Ví dụ: Đạo hàm giải tích lớp 12, HTML/CSS cơ bản..."
                value={aiMockPrompt}
                onChange={e => setAiMockPrompt(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">Số lượng câu hỏi</label>
              <select
                value={aiMockCount}
                onChange={e => setAiMockCount(parseInt(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={5}>5 câu hỏi (Nhanh)</option>
                <option value={10}>10 câu hỏi (Tiêu chuẩn)</option>
                <option value={15}>15 câu hỏi (Nâng cao)</option>
                <option value={20}>20 câu hỏi (Đầy đủ)</option>
              </select>
            </div>

            <button onClick={startAIMockExam} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-slate-950 dark:text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 mt-4">
              Soạn đề & Bắt đầu làm bài
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">Đang tải...</div>;

  const renderDashboardOverview = () => {
    const filteredResults = (examResults || []).filter((r: any) => {
      if (selectedClassFilters.length === 0) return true;
      return selectedClassFilters.includes(r.class_ref);
    });

    const chartData = [...filteredResults].reverse().map((r: any) => ({
      name: new Date(r.submitted_at).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
      score: r.score,
      fullDate: new Date(r.submitted_at).toLocaleString('vi-VN'),
      examTitle: r.exam_title,
      attempt: r.attempt_number
    }));

    return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tổng Quan Học Tập</h2>
        <button onClick={() => joinClassByCode()} className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition">
          + Tham gia lớp học bằng mã
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-blue-200/70 dark:border-slate-700/50 shadow-lg flex items-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-transparent dark:from-transparent pointer-events-none"></div>
          <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-xl mr-4 shadow-lg shadow-blue-500/30 relative z-10"><BookOpen size={28} /></div>
          <div className="relative z-10">
            <p className="text-sm text-blue-600/80 dark:text-slate-400 font-medium">Lớp Đang Học</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.total_classes || 0}</h3>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-emerald-200/70 dark:border-slate-700/50 shadow-lg flex items-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-transparent pointer-events-none"></div>
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-xl mr-4 shadow-lg shadow-emerald-500/30 relative z-10"><CreditCard size={28} /></div>
          <div className="relative z-10">
            <p className="text-sm text-emerald-600/80 dark:text-slate-400 font-medium">Học Phí Đã Đầu Tư</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{(overview?.total_tuition || 0).toLocaleString()} <span className="text-sm text-emerald-500 font-normal">VNĐ</span></h3>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-orange-200/70 dark:border-slate-700/50 shadow-lg flex items-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-transparent dark:from-transparent pointer-events-none"></div>
          <div className="p-4 bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl mr-4 shadow-lg shadow-orange-500/30 relative z-10"><Award size={28} /></div>
          <div className="relative z-10">
            <p className="text-sm text-orange-600/80 dark:text-slate-400 font-medium">Bài Thi Hoàn Thành</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.exams_completed || 0}</h3>
          </div>
        </div>
      </div>

      {/* Tiến độ học tập */}
      <div className="bg-white/70 dark:bg-slate-800/60 p-6 rounded-xl border border-blue-200/60 dark:border-slate-700/50 shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Tiến Độ Học Tập
          </h3>
        </div>
        
        {myClasses.length === 0 ? (
          <div className="text-center py-6 text-slate-500">Bạn chưa tham gia lớp học nào.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {myClasses.map((c: any) => {
              const classId = c.class_id || c.id;
              const prog = learningProgress[classId];
              const percent = prog?.progress_percent || 0;
              const passed = prog?.passed_chapters || 0;
              const total = prog?.total_chapters || 0;

              return (
                <div key={classId} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{c.class_name || c.name}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 mb-2 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {total > 0 ? `Đã hoàn thành ${passed}/${total} chương` : 'Chưa có lộ trình học'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={20} /> Biểu đồ điểm số
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Class Filter Dropdown */}
            <MultiSelectDropdown 
              options={myClasses.map((c: any) => ({ value: c.class_id || c.id, label: c.class_name || c.name }))}
              selected={selectedClassFilters}
              onChange={setSelectedClassFilters}
              placeholder="Tất cả lớp học"
            />

            {/* Time Filter Buttons */}
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              {['week', 'month', 'year', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChartFilter(filter as any)}
                  className={`px-3 py-1 text-sm rounded-md transition ${chartFilter === filter ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {filter === 'week' ? 'Tuần' : filter === 'month' ? 'Tháng' : filter === 'year' ? 'Năm' : 'Tất cả'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  formatter={(value: any, name: any, props: any) => [
                    <span className="font-bold text-emerald-400">{value} điểm</span>, 
                    <div className="text-xs text-slate-300 mt-1">Bài thi: {props.payload.examTitle} (Lần {props.payload.attempt})</div>
                  ]}
                  labelFormatter={(label) => `Ngày nộp: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-72 text-slate-500">Chưa có dữ liệu bài thi</div>
        )}
      </div>

    </div>
  );
  };

  const renderMyClasses = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Lớp Học Của Tôi</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
        {myClasses.length > 0 ? myClasses.map((cls: any) => {
          const isPending = cls.join_status === 'Pending';
          return (
          <div key={cls.class_id || cls.id} onClick={() => { if(!isPending) { setSelectedClass(cls); setActiveMenu('classes'); } }} className={`bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-lg transition-all ${isPending ? 'opacity-80 cursor-not-allowed' : 'hover:border-slate-500 cursor-pointer group hover:-translate-y-1'}`}>
            <div className={`h-32 relative flex justify-center items-center ${isPending ? 'bg-slate-200 dark:bg-slate-800' : 'bg-gradient-to-br from-blue-900/60 to-indigo-900/60'}`}>
              <BookOpen size={40} className="text-slate-900/20 dark:text-white/20" />
              {isPending && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Chờ giáo viên duyệt</span>
                </div>
              )}
              {!isPending && (
                <div className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded-md border border-emerald-500/20">
                  {cls.status}
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-xs text-blue-400 mb-1 font-mono">{cls.class_code}</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{cls.class_name || cls.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">GV: {cls.teacher_name || 'Không rõ'}</p>
              <button disabled={isPending} className={`w-full py-2 rounded-lg text-sm font-medium transition flex items-center justify-center ${isPending ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-slate-900 dark:text-white'}`}>
                {isPending ? 'Đang chờ duyệt...' : 'Vào lớp học \u2192'}
              </button>
            </div>
          </div>
        )}) : (
          <div className="col-span-3 text-center py-20 bg-white/20 dark:bg-slate-800/20 rounded-xl border border-slate-200/50 dark:border-slate-700/50 border-dashed">
            <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">Bạn chưa tham gia lớp học nào.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderClassDetail = () => (
    <div className="animate-fade-in flex flex-col flex-1 min-h-0 w-full">
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedClass(null)} className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded-lg transition border border-slate-200 dark:border-slate-700">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
              {selectedClass.class_name || selectedClass.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-slate-500">GV: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedClass.teacher_name || 'Không rõ'}</span></p>
              {selectedClass.teacher_name && (() => {
                const ratingInfo = teacherRatingService.getTeacherRatingDetails(selectedClass.teacher_name);
                const hasRated = ratingInfo.reviews.some((r: any) => r.student === (user?.email || ''));
                return (
                  <button 
                    onClick={() => {
                      if (hasRated) {
                        alert("Bạn đã đánh giá giáo viên này rồi!");
                        return;
                      }
                      setShowRatingModal(selectedClass.teacher_name);
                    }} 
                    className={`text-[10px] flex items-center px-2 py-0.5 rounded-full transition shadow-sm font-bold ${hasRated ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30'}`}
                  >
                    <Star size={10} className="mr-1" fill="currentColor" /> {hasRated ? 'Đã đánh giá' : 'Đánh giá'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex text-sm font-medium">
            <button onClick={() => setClassDetailTab('chat')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'chat' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><MessageSquare size={16} className="mr-2"/> Thảo Luận</button>
            <button onClick={() => setClassDetailTab('course_outline')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'course_outline' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><Folder size={16} className="mr-2"/> Lộ Trình Học</button>
            <button onClick={() => setClassDetailTab('members')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'members' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><Users size={16} className="mr-2"/> Thành Viên</button>
          </div>
          <button onClick={leaveCurrentClass} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-bold flex items-center transition">
            <LogOut size={16} className="mr-2" /> Thoát lớp
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {classDetailTab === 'chat' && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex flex-col overflow-hidden">
            <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center"><MessageSquare size={18} className="mr-2 text-blue-400"/> Kênh thảo luận chung</h3>
            </div>
            <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {chatMessages.length === 0 && (
                <div className="text-center text-slate-500 text-sm">Chưa có tin nhắn.</div>
              )}
              {chatMessages.map((msg: any, i) => {
                const isMine = msg.sender_email === user?.email;
                if (msg.isSystem) {
                  return (
                    <div key={i} className="flex justify-center my-2">
                      <div className="bg-red-500/10 text-red-400 px-4 py-1.5 rounded-full text-xs font-medium border border-red-500/20 flex items-center shadow-sm">
                        <span className="mr-2">🚫</span>
                        {msg.message || msg.content}
                      </div>
                    </div>
                  );
                }
                const content = msg.message || msg.content;
                const isExamAnnouncement = content.includes("Bài thi mới:") && msg.is_teacher;
                let examTitle = "";
                if (isExamAnnouncement) {
                  const match = content.match(/Bài thi mới:\s*\*\*(.*?)\*\*/);
                  if (match) examTitle = match[1].trim();
                }

                return (
                  <div key={msg.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 px-1">
                      {isMine ? 'Bạn' : msg.sender} {msg.is_teacher ? '(Giáo viên)' : ''} • {msg.time || msg.creation?.substring(11,16)}
                    </span>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${isMine ? 'bg-blue-600 text-slate-900 dark:text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                      <p className="whitespace-pre-wrap text-sm">{content}</p>
                      {isExamAnnouncement && examTitle && (
                        <div className="mt-3 border-t border-slate-300 dark:border-slate-600 pt-3">
                           <button 
                             onClick={async () => {
                               let latestData = dashData;
                               if (!latestData?.upcoming_exams?.find((e: any) => e.title.trim() === examTitle.trim())) {
                                  try {
                                    const res = await api.get('/api/method/flying_class.flying_class.api.get_student_dashboard_data');
                                    latestData = res.data.message;
                                    setDashData(latestData);
                                  } catch (e) {}
                               }
                               const linkedExam = latestData?.upcoming_exams?.find((e: any) => e.title.trim() === examTitle.trim());
                               if (linkedExam) {
                                  setActiveMenu('exams');
                                  setTimeout(() => confirmAndStartExam(linkedExam), 100);
                               } else {
                                  alert("Không tìm thấy bài thi này trong danh sách, có thể đã hết hạn hoặc bị ẩn.");
                               }
                             }}
                             className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm w-full justify-center"
                           >
                             <PlayCircle size={16} /> Làm Bài Ngay
                           </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-3">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Nhập tin nhắn..." 
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" 
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white px-5 rounded-xl transition flex items-center justify-center disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {classDetailTab === 'course_outline' && (
          <div className="absolute inset-0">
            <StudentCourseOutline classId={selectedClass.class_id || selectedClass.id} />
          </div>
        )}

        {classDetailTab === 'members' && (
          <div className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            {/* Teacher info */}
            {selectedClass?.teacher_name && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Giáo Viên Phụ Trách</h4>
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {selectedClass.teacher_name?.charAt(0) || 'GV'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedClass.teacher_name}</p>
                      <p className="text-xs text-blue-400 font-medium">Giáo viên lớp học</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTeacherProfileModal(selectedClass)}
                    className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition shadow-lg shadow-blue-500/20"
                  >
                    <User size={16} /> Xem hồ sơ
                  </button>
                </div>
              </div>
            )}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Star size={14} className="text-amber-500" fill="currentColor"/> Bảng Xếp Hạng Lớp (Top 3)</h4>
              <div className="flex justify-center items-end gap-4 h-56 bg-gradient-to-t from-slate-100 to-transparent dark:from-slate-800 rounded-xl border-b-4 border-amber-400 p-4 relative pt-12">
                {(() => {
                  const sortedMembers = [...members]
                    .map(m => ({ ...m, score: m.total_score || 0 }))
                    .filter(m => m.score > 0)
                    .sort((a, b) => b.score - a.score);
                  const top3 = sortedMembers.slice(0, 3);
                  if (top3.length === 0) return <div className="text-slate-500 self-center">Chưa có dữ liệu</div>;

                  return (
                    <>
                      {/* Top 2 */}
                      {top3[1] && (
                        <div className="flex flex-col items-center justify-end h-[70%] w-1/3">
                          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xl font-bold mb-2 border-2 border-slate-300">
                            {top3[1].full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="text-sm font-bold truncate w-full text-center text-slate-700 dark:text-slate-300">{top3[1].full_name}</div>
                          <div className="text-xs text-slate-500 mt-1">{top3[1].score} điểm</div>
                          <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-t-lg mt-2 flex-1 flex items-start justify-center pt-2 font-bold text-slate-600 dark:text-slate-300 text-lg">2</div>
                        </div>
                      )}
                      {/* Top 1 */}
                      {top3[0] && (
                        <div className="flex flex-col items-center justify-end h-full w-1/3 z-10 relative">
                          <div className="absolute -top-10 animate-bounce"><Star fill="#f59e0b" className="text-amber-500 drop-shadow-md" size={32}/></div>
                          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl font-bold mb-2 border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                            {top3[0].full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="text-sm font-bold truncate w-full text-center text-amber-600 dark:text-amber-400">{top3[0].full_name}</div>
                          <div className="text-xs text-amber-500/80 mt-1 font-bold">{top3[0].score} điểm</div>
                          <div className="w-full bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-lg mt-2 flex-1 flex items-start justify-center pt-2 font-bold text-white text-2xl shadow-lg">1</div>
                        </div>
                      )}
                      {/* Top 3 */}
                      {top3[2] && (
                        <div className="flex flex-col items-center justify-end h-[60%] w-1/3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 text-lg font-bold mb-2 border-2 border-orange-300">
                            {top3[2].full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="text-sm font-bold truncate w-full text-center text-orange-700 dark:text-orange-400">{top3[2].full_name}</div>
                          <div className="text-xs text-slate-500 mt-1">{top3[2].score} điểm</div>
                          <div className="w-full bg-orange-300 dark:bg-orange-700 rounded-t-lg mt-2 flex-1 flex items-start justify-center pt-2 font-bold text-orange-800 dark:text-orange-200 text-lg">3</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Học Viên ({members.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {members.map((m: any, i) => (
                <div key={i} className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold mr-4 text-sm">
                    {m.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{m.full_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{m.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderExams = () => {
    const visibleExams = dashData?.upcoming_exams?.filter((e: any) => {
      const passHidden = showHiddenExams || !hiddenExamIds.includes(e.id);
      const classId = e.class_ref || e.class_id || e.class;
      const passClass = selectedClassFilters.length === 0 || selectedClassFilters.includes(classId);
      return passHidden && passClass;
    }) || [];

    // Build map: exam_ref -> count of attempts
    const attemptCountMap: Record<string, number> = {};
    (examResults || []).forEach((r: any) => {
      if (r.exam_ref) {
        attemptCountMap[r.exam_ref] = (attemptCountMap[r.exam_ref] || 0) + 1;
      }
    });

    // Get max_attempts for each exam from dashData
    const examMaxAttempts: Record<string, number> = {};
    (dashData?.upcoming_exams || []).forEach((e: any) => {
      examMaxAttempts[e.id] = e.max_attempts || 1;
    });

    // Split into undone and done exams
    const undoneExams = visibleExams.filter((e: any) => (attemptCountMap[e.id] || 0) === 0);
    const doneExams = visibleExams.filter((e: any) => (attemptCountMap[e.id] || 0) > 0);

    const renderExamCard = (exam: any) => {
      const isHidden = hiddenExamIds.includes(exam.id);
      const attemptsDone = attemptCountMap[exam.id] || 0;
      const maxAttempts = exam.max_attempts || 1;
      const isDone = attemptsDone > 0;
      const canRetry = attemptsDone < maxAttempts;
      const nextAttemptNum = attemptsDone + 1;
      const isExpired = exam.end_time && new Date(exam.end_time) < new Date();

      return (
        <div key={exam.id} className={`p-4 md:p-5 rounded-xl border flex flex-col xl:flex-row justify-between items-start xl:items-center shadow-lg transition relative overflow-hidden shrink-0
          ${isHidden ? 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50 opacity-70' 
            : isDone 
              ? 'bg-slate-100/60 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 opacity-80' 
              : 'bg-white/90 dark:bg-slate-800/90 border-emerald-500/50 dark:border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10 ring-1 ring-emerald-500/20'}`}
        >
          {/* Badge trạng thái */}
          {isExpired && !isDone && !isHidden ? (
            <div className="absolute top-0 right-0">
              <span className="bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">HẾT HẠN</span>
            </div>
          ) : !isDone && !isHidden && (
            <div className="absolute top-0 right-0">
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">MỚI</span>
            </div>
          )}
          {isDone && !canRetry && (
            <div className="absolute top-0 right-0">
              <span className="bg-slate-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">ĐÃ HOÀN THÀNH</span>
            </div>
          )}
          {isDone && canRetry && !isHidden && (
            <div className="absolute top-0 right-0">
              <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">CÓ THỂ LÀM LẠI</span>
            </div>
          )}

          <div className="mb-4 xl:mb-0 pr-12 xl:pr-16 w-full">
            <h4 className={`font-bold mb-1 flex items-center gap-2 ${isDone ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
              {!isDone && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0"></span>}
              <span className="truncate">{exam.title}</span>
              {isHidden && <span className="ml-2 text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 flex-shrink-0">Đã ẩn</span>}
            </h4>
            <p className={`text-sm mb-2 ${isDone ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
              Môn: {exam.class_name}
              {isDone && <span className="ml-2 text-xs text-slate-400 flex-shrink-0">• Đã làm {attemptsDone}/{maxAttempts} lần</span>}
            </p>
            <p className={`text-xs flex items-center flex-wrap gap-1 ${isDone ? 'text-slate-400 dark:text-slate-500' : 'text-blue-400'}`}>
              <Clock size={14} className="mr-0.5 flex-shrink-0" /> {exam.duration} phút 
              <span className="opacity-50">|</span> Mở từ {exam.start_time?.substring(0,16)}
            </p>
          </div>

          <div className="flex gap-2 w-full xl:w-auto mt-2 xl:mt-0">
            <button onClick={() => toggleHideExam(exam.id)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg font-medium transition flex-1 xl:flex-none text-sm">
              {isHidden ? 'Hiện' : 'Ẩn'}
            </button>
            {isDone && !canRetry ? (
              <div className="px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-sm cursor-not-allowed flex-[2] xl:flex-none whitespace-nowrap">
                <span>✓</span> Đã hoàn thành
              </div>
            ) : isExpired ? (
              <div className="px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 bg-rose-100 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-sm cursor-not-allowed flex-[2] xl:flex-none whitespace-nowrap border border-rose-200 dark:border-rose-500/30">
                Hết thời gian
              </div>
            ) : (
              <button onClick={() => confirmAndStartExam(exam)} className={`px-4 py-2 rounded-lg font-bold flex items-center shadow flex-[2] xl:flex-none justify-center gap-2 transition text-sm whitespace-nowrap
                ${!isDone 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30' 
                  : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'}`}
              >
                <PlayCircle size={16} className="flex-shrink-0" />
                {!isDone ? 'Làm Bài' : `Làm Lại Lần ${nextAttemptNum}`}
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bài Thi & Kiểm Tra</h2>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Bài Kiểm Tra Mới / Sắp Tới</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <MultiSelectDropdown 
              options={myClasses.map((c: any) => ({ value: c.class_id || c.id, label: c.class_name || c.name }))}
              selected={selectedClassFilters}
              onChange={setSelectedClassFilters}
              placeholder="Tất cả lớp học"
            />
            <button 
              onClick={() => setShowHiddenExams(!showHiddenExams)}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              {showHiddenExams ? 'Ẩn các bài đã ẩn' : 'Hiển thị bài đã ẩn'}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Cột Chưa Làm */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-emerald-500 flex items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> 
              Bài Chưa Làm ({undoneExams.length})
            </h4>
            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {undoneExams.length > 0 ? (
                undoneExams.map(renderExamCard)
              ) : (
                <div className="text-center py-10 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-500">
                  Không có bài kiểm tra nào chưa làm.
                </div>
              )}
            </div>
          </div>

          {/* Cột Đã Làm */}
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-slate-500 flex items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span> 
              Bài Đã Làm ({doneExams.length})
            </h4>
            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
              {doneExams.length > 0 ? (
                doneExams.map(renderExamCard)
              ) : (
                <div className="text-center py-10 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-500">
                  Chưa có bài kiểm tra nào được hoàn thành.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }

  const renderExamHistory = () => {
    const filteredResults = (examResults || []).filter((r: any) => {
      if (selectedClassFilters.length === 0) return true;
      return selectedClassFilters.includes(r.class_ref);
    });

    const chartData = [...filteredResults].reverse().map((r: any) => ({
      name: new Date(r.submitted_at).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }),
      score: r.score,
      fullDate: new Date(r.submitted_at).toLocaleString('vi-VN'),
      examTitle: r.exam_title,
      attempt: r.attempt_number
    }));

    return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Thống Kê & Lịch Sử Học Tập</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">Theo dõi điểm số và tiến trình học tập của bạn qua các bài kiểm tra.</p>
      
      {/* Chart Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={20} /> Biểu đồ điểm số
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Class Filter Dropdown */}
            <MultiSelectDropdown 
              options={myClasses.map((c: any) => ({ value: c.class_id || c.id, label: c.class_name || c.name }))}
              selected={selectedClassFilters}
              onChange={setSelectedClassFilters}
              placeholder="Tất cả lớp học"
            />

            {/* Time Filter Buttons */}
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              {['week', 'month', 'year', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChartFilter(filter as any)}
                  className={`px-3 py-1 text-sm rounded-md transition ${chartFilter === filter ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {filter === 'week' ? 'Tuần' : filter === 'month' ? 'Tháng' : filter === 'year' ? 'Năm' : 'Tất cả'}
                </button>
              ))}
            </div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  formatter={(value: any, name: any, props: any) => [
                    <span className="font-bold text-emerald-400">{value} điểm</span>, 
                    <div className="text-xs text-slate-300 mt-1">Bài thi: {props.payload.examTitle} (Lần {props.payload.attempt})</div>
                  ]}
                  labelFormatter={(label) => `Ngày nộp: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#3b82f6' }}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
            Chưa có đủ dữ liệu để vẽ biểu đồ. Hãy hoàn thành ít nhất 1 bài thi!
          </div>
        )}
      </div>

      {/* History Table Section */}
      <div>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-4">Chi tiết các bài đã nộp</h3>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 text-left font-bold">Bài Thi</th>
                <th className="px-6 py-4 text-left font-bold">Lớp</th>
                <th className="px-6 py-4 text-center font-bold">Câu Đúng</th>
                <th className="px-6 py-4 text-center font-bold">Điểm Số</th>
                <th className="px-6 py-4 text-center font-bold text-red-400">Vi Phạm</th>
                <th className="px-6 py-4 text-center font-bold">Lần Làm</th>
                <th className="px-6 py-4 text-right font-bold">Ngày Nộp</th>
                <th className="px-6 py-4 text-right font-bold">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredResults && filteredResults.length > 0 ? (
                filteredResults.map((r: any) => (
                  <tr key={r.name} className="hover:bg-slate-100/30 dark:bg-slate-700/30 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{r.exam_title}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{r.class_name}</td>
                    <td className="px-6 py-4 text-center">{r.correct_answers}/{r.total_questions}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${r.score >= 8 ? 'text-emerald-400' : r.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {r.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-red-500 bg-red-500/5">{localStorage.getItem(`fc_violation_${r.exam_ref}`) || 0}</td>
                    <td className="px-6 py-4 text-center">Lần {r.attempt_number || 1}</td>
                    <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{r.submitted_at ? new Date(r.submitted_at).toLocaleString('vi-VN') : 'N/A'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-xs font-semibold">Đã nộp</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Chưa có kết quả bài thi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  }


  const renderExamRoom = () => {
    // Build watermark text repeated diagonally
    const wmText = `${user?.full_name || ''} • ${user?.email || ''} • ${new Date().toLocaleDateString('vi-VN')}`;
    const wmRepeat = Array(60).fill(wmText).join('   ');

    return (
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
            {wmRepeat}
          </div>
        ))}
      </div>

      {/* Warning banner */}
      <div className="bg-red-600 text-white text-center text-xs md:text-sm font-bold py-2 px-4 flex items-center justify-center gap-3 flex-wrap" style={{ position: 'relative', zIndex: 201 }}>
        <span className="animate-pulse">🔒</span>
        <span>PHÒNG THI — Bạn KHÔNG được phép chuyển tab, sao chép, chụp ảnh màn hình hoặc thoát ra ngoài. Mỗi vi phạm sẽ bị ghi nhận!</span>
        <span className="animate-pulse">🔒</span>
      </div>

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-lg gap-4 relative z-10">
        <div className="w-full text-center md:text-left">
          <h2 className="text-xl font-bold text-emerald-400 mb-1 truncate">{examDetails?.exam?.title}</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center md:justify-start">
            <BookOpen size={12} className="mr-1" /> {selectedExam.class_name}
          </p>
        </div>
        <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-end">
          {cheatWarnings > 0 && (
            <div className="px-3 md:px-4 py-2 rounded-lg font-bold text-sm md:text-base bg-red-600/20 text-red-400 border border-red-500/50 animate-pulse whitespace-nowrap">
              ⚠️ Vi phạm: {cheatWarnings} lần
            </div>
          )}
          <div className={`px-3 md:px-4 py-2 rounded-lg font-mono text-lg md:text-xl font-bold border ${timeLeft < 60 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-slate-50 dark:bg-slate-900 text-emerald-400 border-emerald-500/30'}`}>
            <Clock size={16} className="inline mr-1 md:mr-2" /> {formatTime(timeLeft)}
          </div>
          <button onClick={handleSubmitExam} disabled={examSubmitting || !!examScoreResult} className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 md:px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 shadow-lg shadow-blue-500/20 whitespace-nowrap shrink-0">
            {examSubmitting ? 'Đang nộp...' : 'Nộp Bài'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:px-20 bg-slate-50/50 dark:bg-slate-900/50">
        {!examScoreResult ? (
          <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {examDetails?.questions?.map((q: any, i: number) => (
              <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-6 flex items-start">
                  <span className="text-blue-400 font-bold mr-2 whitespace-nowrap">Câu {i + 1}:</span>
                  <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {q.question_text || ''}
                    </ReactMarkdown>
                  </div>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const optKey = `option_${opt.toLowerCase()}`;
                    const isSelected = examAnswers[q.id] === opt;
                    return (
                      <div 
                        key={opt}
                        onClick={() => setExamAnswers({...examAnswers, [q.id]: opt})}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start ${isSelected ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-slate-500 hover:bg-white dark:bg-slate-800'}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500 text-slate-900 dark:text-white' : 'border-slate-500 text-transparent'}`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-transparent'}`}></div>
                        </div>
                        <div>
                          <span className="font-bold mr-2 text-slate-700 dark:text-slate-300">{opt}.</span>
                          <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q[optKey] || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            <div className="flex justify-center mt-12 pt-8 border-t border-slate-200/50 dark:border-slate-700/50">
              <button 
                onClick={handleSubmitExam} 
                disabled={examSubmitting || !!examScoreResult} 
                className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-12 py-4 rounded-xl font-bold text-xl transition disabled:opacity-50 shadow-lg shadow-blue-500/20 w-full md:w-auto"
              >
                {examSubmitting ? 'Đang nộp bài...' : 'Hoàn Thành & Nộp Bài'}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-200 dark:border-slate-700 shadow-2xl text-center max-w-md w-full animate-bounce-in">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award size={48} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Đã Nộp Bài!</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">Kết quả của bạn cho bài thi này</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Số câu đúng</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{examScoreResult.correct_answers}/{examScoreResult.total_questions}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Điểm số</p>
                  <p className={`text-3xl font-bold ${examScoreResult.score >= 8 ? 'text-emerald-400' : examScoreResult.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {examScoreResult.score}
                  </p>
                </div>
              </div>
              
              <button onClick={() => { setSelectedExam(null); setActiveMenu('exams'); }} className="w-full bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition">
                Quay Lại Danh Sách
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  }

  const renderNotifications = () => (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Thông Báo Của Bạn</h2>
      <div className="bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
        {dashData?.notifications && dashData.notifications.length > 0 ? (
          dashData.notifications.map((n: any) => (
            <div 
              key={n.name} 
              onClick={() => handleNotificationClick(n)}
              className={`p-5 flex gap-4 transition hover:bg-slate-100/30 dark:hover:bg-slate-800/30 cursor-pointer ${!n.read ? 'bg-blue-600/5 dark:bg-blue-600/10' : ''}`}
            >
              <div className={`mt-1 p-2 rounded-full h-fit ${!n.read ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                <Bell size={20} />
              </div>
              <div>
                <h4 className={`text-sm md:text-base mb-1 ${!n.read ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>{n.subject}</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2 whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: n.content}}></div>
                <p className="text-xs text-slate-500 font-mono">{n.creation?.substring(0, 16)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-500">Chưa có thông báo nào.</div>
        )}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="animate-fade-in max-w-3xl mx-auto w-full">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Hồ Sơ Của Bạn</h2>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-lg">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-200 dark:border-slate-700 pb-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border-4 border-slate-300 dark:border-slate-600 flex justify-center items-center">
                {avatarPreview ? (
                  <img src={avatarPreview.startsWith('data:') ? avatarPreview : `${import.meta.env.VITE_API_URL || ''}${avatarPreview}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : user?.user_image ? (
                  <img src={user.user_image.startsWith('http') ? user.user_image : `${import.meta.env.VITE_API_URL || ''}${user.user_image}`} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-500" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 p-2 rounded-full text-slate-900 dark:text-white cursor-pointer shadow-lg transition">
                <ImageIcon size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Email (Đăng nhập)</label>
                <input type="text" value={user?.email || ''} readOnly className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Họ và Tên</label>
                <input type="text" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Ngày sinh</label>
                  <input type="date" value={profileData.dob} onChange={e => setProfileData({...profileData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Số điện thoại</label>
                  <input type="tel" value={profileData.mobile_no} onChange={e => setProfileData({...profileData, mobile_no: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-2 space-y-4">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2 flex items-center"><Key size={18} className="mr-2" /> Đổi mật khẩu</h3>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Mật khẩu mới (Bỏ trống nếu không đổi)</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu mới..." value={profileData.new_password} onChange={e => setProfileData({...profileData, new_password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 block">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Nhập lại mật khẩu mới..."
                  value={profileData.confirm_password}
                  onChange={e => setProfileData({...profileData, confirm_password: e.target.value})}
                  className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-lg p-3 pr-10 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 ${
                    profileData.confirm_password && profileData.new_password !== profileData.confirm_password
                      ? 'border-red-400 focus:border-red-400'
                      : profileData.confirm_password && profileData.new_password === profileData.confirm_password
                      ? 'border-emerald-400 focus:border-emerald-400'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {profileData.confirm_password && profileData.new_password !== profileData.confirm_password && (
                <p className="text-xs text-red-400 mt-1">⚠ Mật khẩu không khớp</p>
              )}
              {profileData.confirm_password && profileData.new_password === profileData.confirm_password && profileData.new_password && (
                <p className="text-xs text-emerald-400 mt-1">✓ Mật khẩu khớp</p>
              )}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/20">
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-lg shadow-blue-500/20">FC</div>
              <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">FlyingClass</span>
              <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20 ml-2">Student</span>
            </div>
            <div className="flex items-center gap-5">
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-slate-100/50 dark:bg-slate-700/50 transition text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="text-right flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-slate-300 dark:border-slate-600 shadow-sm">
                  {avatarPreview ? (
                    <img src={avatarPreview.startsWith('data:') ? avatarPreview : `${import.meta.env.VITE_API_URL || ''}${avatarPreview}`} className="w-full h-full object-cover" alt="User" />
                  ) : user?.user_image ? (
                    <img src={user.user_image.startsWith('http') ? user.user_image : `${import.meta.env.VITE_API_URL || ''}${user.user_image}`} className="w-full h-full object-cover" alt="User" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 dark:text-slate-400 text-lg font-bold">{profileData.full_name?.charAt(0) || user?.full_name?.charAt(0) || 'U'}</div>
                  )}
                </div>
                <p className="text-base font-bold text-slate-900 dark:text-white">{profileData.full_name || user?.full_name || 'Học sinh'}</p>
              </div>
              <button onClick={logout} className="text-sm bg-red-500/10 text-red-400 px-5 py-2.5 rounded-lg hover:bg-red-500/20 transition font-bold border border-red-500/20">Đăng xuất</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200/50 dark:border-slate-700/50 p-4 flex flex-col gap-2 bg-slate-50/80 dark:bg-slate-900/80">
          <button onClick={() => { setActiveMenu('dashboard'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'dashboard' && !selectedClass ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <LayoutDashboard size={20} /> Tổng Quan
          </button>
          <button onClick={() => { setActiveMenu('classes'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'classes' || selectedClass ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <BookOpen size={20} /> Lớp Học Của Tôi
          </button>
          <button onClick={() => { setActiveMenu('exams'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'exams' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <FileText size={20} /> Bài Kiểm Tra
          </button>
          <button onClick={() => { setActiveMenu('history'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'history' ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <TrendingUp size={20} /> Lịch Sử & Thống Kê
          </button>
          <button onClick={() => { setActiveMenu('notifications'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'notifications' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <Bell size={20} /> Thông Báo
            {dashData?.notifications?.some((n:any) => !n.read) && <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
          </button>
          <button onClick={() => { setActiveMenu('aimock'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'aimock' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <Sparkles size={20} className="text-indigo-400" /> AI Tự Luyện
          </button>
          <button onClick={() => { setActiveMenu('profile'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'profile' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <User size={20} /> Hồ Sơ Của Tôi
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative flex flex-col bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto p-8 lg:p-12 w-full flex-1 flex flex-col">
            {activeMenu === 'dashboard' && !selectedClass && renderDashboardOverview()}
            {activeMenu === 'classes' && !selectedClass && renderMyClasses()}
            {selectedClass && renderClassDetail()}
            {activeMenu === 'exams' && !selectedClass && renderExams()}
            {activeMenu === 'history' && !selectedClass && renderExamHistory()}
            {activeMenu === 'aimock' && !selectedClass && renderAIMockExam()}
            {activeMenu === 'notifications' && !selectedClass && renderNotifications()}
            {activeMenu === 'profile' && !selectedClass && renderProfile()}
          </div>
      </main>
      </div>

      {selectedExam && renderExamRoom()}

      {/* Teacher Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 w-[400px]">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Đánh Giá Giáo Viên</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn đang đánh giá giáo viên: <span className="font-bold text-slate-800 dark:text-white">{showRatingModal}</span></p>
            
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingStars(star)}
                  className={`p-2 transition-transform hover:scale-110 ${ratingStars >= star ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`}
                >
                  <Star size={40} fill="currentColor" />
                </button>
              ))}
            </div>

            <textarea 
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Nhập bình luận của bạn về giáo viên này..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-900 dark:text-white mb-6 resize-none h-24 focus:outline-none focus:border-blue-500"
            />

            <div className="flex gap-3">
              <button onClick={() => { setShowRatingModal(null); setRatingStars(0); setRatingComment(''); }} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-white font-medium transition">Hủy</button>
              <button 
                onClick={async () => {
                  if (ratingStars === 0) { alert("Vui lòng chọn số sao!"); return; }
                  try {
                    const { teacherRatingService } = await import('../services/api');
                    const res = teacherRatingService.rateTeacher(showRatingModal, user?.email || '', ratingStars, ratingComment);
                    if(res.success) {
                      alert(res.message);
                      setShowRatingModal(null);
                      setRatingStars(0);
                      setRatingComment('');
                    }
                  } catch(e) { console.error(e); }
                }} 
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-lg text-white font-bold transition shadow-lg shadow-amber-500/20"
              >
                Gửi Đánh Giá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Profile Modal */}
      {teacherProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
              <button onClick={() => setTeacherProfileModal(null)} className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition font-bold">✕</button>
            </div>
            <div className="px-6 pb-6 pt-0 relative">
              <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-4xl font-bold mx-auto -mt-12 shadow-lg z-10 relative">
                {(teacherProfileModal.teacher_name || 'GV').charAt(0).toUpperCase()}
              </div>
              <div className="text-center mt-4 mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{teacherProfileModal.teacher_name || 'Giáo viên'}</h3>
                {teacherProfileData?.count > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-amber-500 font-bold bg-amber-500/10 inline-flex px-3 py-1 rounded-full border border-amber-500/20">
                    <Star size={16} fill="currentColor" /> {teacherProfileData.average} ({teacherProfileData.count} đánh giá)
                  </div>
                )}
                {teacherProfileModal.teacher_email && (
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{teacherProfileModal.teacher_email}</p>
                )}
                <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-medium mt-3 border border-blue-500/20">
                  <BookOpen size={12} /> Giáo viên phụ trách
                </div>
              </div>
              
              {teacherProfileData?.reviews?.length > 0 && (
                <div className="mb-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 max-h-48 overflow-y-auto custom-scrollbar space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white sticky top-0 bg-slate-50 dark:bg-slate-900/90 py-1">Bình luận của học sinh</h4>
                  {teacherProfileData.reviews.map((rev: any, idx: number) => (
                    <div key={idx} className="border-b border-slate-200 dark:border-slate-700/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{rev.student}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex items-center shadow-sm font-bold"><Star size={8} className="mr-0.5" fill="currentColor"/> {rev.stars}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{rev.comment || 'Không có bình luận'}"</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Lớp học</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{teacherProfileModal.class_name || teacherProfileModal.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Mã lớp</span>
                  <span className="text-sm font-mono font-bold text-blue-400">{teacherProfileModal.class_code}</span>
                </div>
              </div>
              <button onClick={() => setTeacherProfileModal(null)} className="mt-4 w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-2.5 rounded-xl font-medium transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FlyingClass AI Floating Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Chat window */}
        {fcAiChatOpen && (
          <div className="mb-4 w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] bg-slate-900/95 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in text-white">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 flex justify-between items-center border-b border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Bot size={20} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">FlyingClass AI</h4>
                  <p className="text-[10px] text-slate-400">Trợ lý hỗ trợ 24/7</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                  fcAiUsedTokens >= 45000 
                    ? 'bg-red-500/15 text-red-400 border-red-500/30' 
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}>
                  {fcAiUsedTokens.toLocaleString()} / 50k tokens
                </span>
                <button 
                  onClick={() => setFcAiChatOpen(false)} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft size={20} className="rotate-180" />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950/40">
              {fcAiMessages.length === 0 ? (
                <div className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl rounded-tl-none border border-slate-700/30 text-slate-200 text-sm max-w-[80%] shadow-sm leading-relaxed">
                    Xin chào! Tôi là <strong>FlyingClass AI</strong>, trợ lý học tập trực tuyến thông minh của bạn. 
                    Tôi sử dụng công nghệ Google Gemini để giúp bạn giải đáp mọi thắc mắc học tập. Bạn cần tôi hỗ trợ chủ đề gì hôm nay?
                  </div>
                </div>
              ) : (
                fcAiMessages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  return (
                    <div key={idx} className={`flex gap-2.5 items-start ${isUser ? 'justify-end' : ''}`}>
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                          <Bot size={16} />
                        </div>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] shadow-sm leading-relaxed overflow-x-auto ${
                        isUser 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : m.text.includes("429 Insufficient Quota") || m.text.includes("hạn mức 50,000 token")
                            ? 'bg-red-950/50 text-red-200 border border-red-900/40 rounded-tl-none'
                            : 'bg-slate-800/80 text-slate-200 border border-slate-700/30 rounded-tl-none'
                      }`}>
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                          <ReactMarkdown 
                            remarkPlugins={[remarkMath]} 
                            rehypePlugins={[rehypeKatex]}
                          >
                            {m.text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {fcAiLoading && (
                <div className="flex gap-2.5 items-start">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 flex-shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-slate-800/80 px-4 py-2.5 rounded-2xl rounded-tl-none border border-slate-700/30 text-slate-400 text-sm shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={fcAiEndRef} />
            </div>

            {/* Input area */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendFcAiMessage(); }} 
              className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 items-center"
            >
              <input 
                type="text" 
                placeholder={fcAiUsedTokens >= 50000 ? "Bạn đã hết hạn mức AI..." : "Hỏi FlyingClass AI về bài học..."}
                value={fcAiInput}
                onChange={e => setFcAiInput(e.target.value)}
                disabled={fcAiLoading || fcAiUsedTokens >= 50000}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50 text-slate-100"
              />
              <button 
                type="submit" 
                disabled={!fcAiInput.trim() || fcAiLoading || fcAiUsedTokens >= 50000}
                className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Chat toggle button */}
        <button 
          onClick={() => setFcAiChatOpen(!fcAiChatOpen)} 
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white shadow-xl shadow-indigo-500/20 hover:scale-105 transition-transform flex items-center justify-center relative border border-indigo-400/20 group"
          title="Trợ lý FlyingClass AI"
        >
          {fcAiChatOpen ? (
            <ChevronLeft size={24} className="rotate-[270deg] transition-transform duration-300" />
          ) : (
            <MessageSquare size={24} className="transition-transform duration-300" />
          )}
          
          {!fcAiChatOpen && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full w-5 h-5 text-[10px] flex items-center justify-center border border-slate-900 animate-pulse">
              AI
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
