import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { studentService, classService, api } from '../services/api';
import { useSessionState } from '../hooks/useSessionState';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { 
  ChevronLeft, MessageSquare, Folder, Users, Link as LinkIcon, Send, Key, Image as ImageIcon, Star, CreditCard, Award, PlayCircle, Clock, LogOut, Sun, Moon, Eye, EyeOff, BookOpen,
  LayoutDashboard, FileText, Bell, User, TrendingUp
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Documents & Members State
  const [documents, setDocuments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Exam State
  const [examResults, setExamResults] = useState<any[]>([]);
  const [chartFilter, setChartFilter] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [selectedExam, setSelectedExam] = useState<any>(null); // For taking exam
  const [examDetails, setExamDetails] = useState<any>(null);
  const [examAnswers, setExamAnswers] = useState<any>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examScoreResult, setExamScoreResult] = useState<any>(null);
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [examStartTime, setExamStartTime] = useState<string | null>(null);

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
    new_password: '' 
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.user_image || null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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

  useEffect(() => {
    if (selectedClass && classDetailTab === 'documents') {
      fetchDocuments();
    }
    if (selectedClass && classDetailTab === 'members') {
      fetchMembers();
    }
  }, [selectedClass, classDetailTab]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

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

  const fetchMyClasses = async () => {
    try {
      const data = await classService.getMyClasses();
      setMyClasses(data.classes || []);
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
  }, [classDetailTab, currentFolderId]);

  const fetchMembers = async () => {
    if (!selectedClass) return;
    try {
      const data = await classService.getClassStudents(selectedClass.class_id || selectedClass.id);
      setMembers(data.students || []);
    } catch(err) { console.error(err); }
  };

  const joinClassByCode = async () => {
    const code = prompt("Nhập mã tham gia lớp học:");
    if (!code) return;
    try {
      await classService.joinClass(code);
      alert("Tham gia lớp thành công!");
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi tham gia lớp");
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
        setProfileData({...profileData, new_password: ''});
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

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-900 dark:text-white">Đang tải...</div>;

  const renderDashboardOverview = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tổng Quan Học Tập</h2>
        <button onClick={joinClassByCode} className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition">
          + Tham gia lớp học bằng mã
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex items-center">
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl mr-4"><BookOpen size={28} /></div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Lớp Đang Học</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.total_classes || 0}</h3>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex items-center">
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-xl mr-4"><CreditCard size={28} /></div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Học Phí Đã Đầu Tư</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{(overview?.total_tuition || 0).toLocaleString()} <span className="text-sm text-emerald-500 font-normal">VNĐ</span></h3>
          </div>
        </div>
        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex items-center">
          <div className="p-4 bg-orange-500/10 text-orange-400 rounded-xl mr-4"><Award size={28} /></div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Bài Thi Hoàn Thành</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{overview?.exams_completed || 0}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Biểu Đồ Điểm Số Các Bài Thi</h3>
        <div className="h-72">
          {overview?.score_growth && overview.score_growth.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview.score_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 10]} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Line type="monotone" dataKey="score" name="Điểm số" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">Chưa có dữ liệu bài thi</div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center mb-4"><Star className="text-yellow-400 mr-2" size={20} /> Lớp Học Gợi Ý Dành Cho Bạn</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {overview?.featured_classes?.map((c: any) => (
            <div key={c.id} className="bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-lg hover:border-slate-500 transition-colors group">
              <div className={`h-24 ${!c.imageIsUrl ? c.image : 'bg-cover bg-center'} relative`} style={c.imageIsUrl ? {backgroundImage: `url(${import.meta.env.VITE_API_URL || ''}${c.image})`} : {}}>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{c.name}</h4>
                <p className="text-emerald-400 font-bold mb-4">{c.price ? c.price.toLocaleString() + ' VNĐ' : 'Miễn phí'}</p>
                <button onClick={joinClassByCode} className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 text-slate-900 dark:text-white py-2 rounded-lg text-sm font-medium transition">
                  Tham gia ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMyClasses = () => (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Lớp Học Của Tôi</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {myClasses.length > 0 ? myClasses.map((cls: any) => (
          <div key={cls.class_id || cls.id} onClick={() => { setSelectedClass(cls); setActiveMenu('classes'); }} className="bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-lg hover:border-slate-500 transition-all cursor-pointer group hover:-translate-y-1">
            <div className="h-32 bg-gradient-to-br from-blue-900/60 to-indigo-900/60 relative flex justify-center items-center">
              <BookOpen size={40} className="text-slate-900/20 dark:text-white/20" />
              <div className="absolute top-3 right-3 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded-md border border-emerald-500/20">
                {cls.status}
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs text-blue-400 mb-1 font-mono">{cls.class_code}</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{cls.class_name || cls.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">GV: {cls.teacher_name || 'Không rõ'}</p>
              <button className="w-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-slate-900 dark:text-white py-2 rounded-lg text-sm font-medium transition flex items-center justify-center">
                Vào lớp học &rarr;
              </button>
            </div>
          </div>
        )) : (
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
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex text-sm font-medium">
            <button onClick={() => setClassDetailTab('chat')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'chat' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><MessageSquare size={16} className="mr-2"/> Thảo Luận</button>
            <button onClick={() => setClassDetailTab('documents')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'documents' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><Folder size={16} className="mr-2"/> Tài Liệu</button>
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
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
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
                return (
                  <div key={msg.id || i} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 px-1">
                      {isMine ? 'Bạn' : msg.sender} {msg.is_teacher ? '(Giáo viên)' : ''} • {msg.time || msg.creation?.substring(11,16)}
                    </span>
                    <div className={`max-w-[70%] p-3 rounded-2xl ${isMine ? 'bg-blue-600 text-slate-900 dark:text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                      <p className="whitespace-pre-wrap text-sm">{msg.message || msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
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

        {classDetailTab === 'documents' && (
          <div className="absolute inset-0 flex gap-6">
            <div className="w-1/3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-4 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center"><Folder size={18} className="mr-2 text-yellow-400"/> Thư mục</h3>
              </div>
              
              {folderHistory.length > 1 && (
                <div className="mb-4 flex items-center text-sm text-blue-400 cursor-pointer hover:text-blue-300 transition" onClick={() => {
                  const newHistory = [...folderHistory];
                  newHistory.pop();
                  const prevFolder = newHistory[newHistory.length - 1];
                  setFolderHistory(newHistory);
                  setCurrentFolderId(prevFolder.id);
                }}>
                  <ChevronLeft size={16} className="mr-1" /> Quay lại: {folderHistory[folderHistory.length - 2].name}
                </div>
              )}

              <div className="space-y-2 flex-1">
                {documents.map(doc => (
                  <div key={doc.id} 
                    onClick={() => {
                      if(doc.type === 'Folder') {
                        setFolderHistory([...folderHistory, {id: doc.id, name: doc.name}]);
                        setCurrentFolderId(doc.id);
                      } else {
                        setSelectedDocument(doc);
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition text-sm border border-transparent ${selectedDocument?.id === doc.id ? 'bg-blue-600/20 border-blue-500/30' : 'hover:bg-slate-100/50 dark:bg-slate-700/50 hover:border-slate-300/50 dark:border-slate-600/50'}`}>
                    <div className="flex items-center flex-1 truncate pr-2">
                      {doc.type === 'Folder' ? <Folder size={16} className="text-yellow-400 mr-3 flex-shrink-0" /> : <LinkIcon size={16} className="text-blue-400 mr-3 flex-shrink-0" />}
                      <span className="text-slate-800 dark:text-slate-200 truncate">{doc.name}</span>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="text-slate-500 text-sm text-center mt-8 italic">Thư mục trống</div>
                )}
              </div>
            </div>

            <div className="w-2/3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center flex-wrap gap-2 text-sm sm:text-base">
                  {selectedDocument ? (
                    <>
                      {folderHistory.map((folder, idx) => (
                        <span key={folder.id || 'root'} className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{folder.name === 'Thư mục gốc' ? 'Tài liệu' : folder.name}</span>
                          <span className="text-slate-600">/</span>
                        </span>
                      ))}
                      <span className="text-blue-400 flex items-center">
                        <LinkIcon size={16} className="mr-1.5"/> {selectedDocument.name}
                      </span>
                    </>
                  ) : "Nhúng Tài Liệu (Embed Iframe)"}
                </h3>
                {selectedDocument && (
                  <a href={selectedDocument.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg transition">
                    <LinkIcon size={14} className="mr-1.5" /> Mở trong trình duyệt
                  </a>
                )}
              </div>
              
              <div className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-dashed rounded-lg overflow-hidden relative group">
                {!selectedDocument ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <FileText size={48} className="mb-2 opacity-30" />
                    <p>Chọn một tài liệu bên trái để xem nội dung.</p>
                  </div>
                ) : selectedDocument.type === 'Link' ? (
                  <iframe 
                    src={getEmbedUrl(selectedDocument.link_url)} 
                    className="w-full h-full bg-white"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <FileText size={64} className="mb-4 opacity-20" />
                    <p>Không thể xem trước loại file này</p>
                    <a href={selectedDocument.link_url} target="_blank" rel="noreferrer" className="mt-4 px-4 py-2 bg-blue-600 text-slate-900 dark:text-white rounded-lg hover:bg-blue-500 transition">Mở trong thẻ mới</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {classDetailTab === 'members' && (
          <div className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {members.map((m: any, i) => (
                <div key={i} className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold mr-4">
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
    const visibleExams = dashData?.upcoming_exams?.filter((e: any) => showHiddenExams || !hiddenExamIds.includes(e.id)) || [];

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

    // Sort: undone first, then done
    const sortedExams = [...visibleExams].sort((a: any, b: any) => {
      const aDone = (attemptCountMap[a.id] || 0) > 0;
      const bDone = (attemptCountMap[b.id] || 0) > 0;
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });

    return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bài Thi & Kiểm Tra</h2>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Bài Kiểm Tra Mới / Sắp Tới</h3>
          <button 
            onClick={() => setShowHiddenExams(!showHiddenExams)}
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            {showHiddenExams ? 'Ẩn các bài đã ẩn' : 'Hiển thị bài đã ẩn'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedExams.length > 0 ? (
            sortedExams.map((exam: any) => {
              const isHidden = hiddenExamIds.includes(exam.id);
              const attemptsDone = attemptCountMap[exam.id] || 0;
              const maxAttempts = exam.max_attempts || 1;
              const isDone = attemptsDone > 0;
              const canRetry = attemptsDone < maxAttempts;
              const nextAttemptNum = attemptsDone + 1;

              return (
              <div key={exam.id} className={`p-5 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg transition relative overflow-hidden
                ${isHidden ? 'bg-white/40 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/50 opacity-70' 
                  : isDone 
                    ? 'bg-slate-100/60 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600 opacity-80' 
                    : 'bg-white/90 dark:bg-slate-800/90 border-emerald-500/50 dark:border-emerald-500/40 hover:border-emerald-400 shadow-emerald-500/10 ring-1 ring-emerald-500/20'}`}
              >
                {/* Badge trạng thái */}
                {!isDone && !isHidden && (
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

                <div className="mb-4 md:mb-0 pr-16">
                  <h4 className={`font-bold mb-1 flex items-center gap-2 ${isDone ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {!isDone && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0"></span>}
                    {exam.title}
                    {isHidden && <span className="ml-2 text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">Đã ẩn</span>}
                  </h4>
                  <p className={`text-sm mb-2 ${isDone ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'}`}>
                    Môn: {exam.class_name}
                    {isDone && <span className="ml-2 text-xs text-slate-400">• Đã làm {attemptsDone}/{maxAttempts} lần</span>}
                  </p>
                  <p className={`text-xs flex items-center ${isDone ? 'text-slate-400 dark:text-slate-500' : 'text-blue-400'}`}>
                    <Clock size={14} className="mr-1" /> {exam.duration} phút | Mở từ {exam.start_time?.substring(0,16)}
                  </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => toggleHideExam(exam.id)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg font-medium transition flex-1 md:flex-none text-sm">
                    {isHidden ? 'Hiện' : 'Ẩn'}
                  </button>
                  {(!isDone || canRetry) && (
                    <button onClick={() => startExam(exam)} className={`px-4 py-2 rounded-lg font-bold flex items-center shadow flex-1 md:flex-none justify-center gap-2 transition text-sm
                      ${!isDone 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30' 
                        : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'}`}
                    >
                      <PlayCircle size={16} />
                      {!isDone ? 'Làm Bài' : `Làm Lại Lần ${nextAttemptNum}`}
                    </button>
                  )}
                  {isDone && !canRetry && (
                    <div className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-sm cursor-not-allowed">
                      <span>✓</span> Đã hoàn thành
                    </div>
                  )}
                </div>
              </div>
            )})
          ) : (
             <div className="col-span-2 text-center py-10 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-500">Không có bài thi nào để hiển thị.</div>
          )}
        </div>
      </div>
    </div>
  );
  }

  const renderExamHistory = () => {
    // Data is already filtered from backend, just format for chart
    const chartData = [...(examResults || [])].reverse().map((r: any) => ({
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
              {examResults && examResults.length > 0 ? (
                examResults.map((r: any) => (
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
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-6">
                  <span className="text-blue-400 mr-2 font-bold">Câu {i + 1}:</span>
                  {q.question_text}
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
                          <span className="text-slate-800 dark:text-slate-200">{q[optKey]}</span>
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
            <div key={n.name} className={`p-5 flex gap-4 transition hover:bg-slate-100/30 dark:bg-slate-700/30 ${!n.read ? 'bg-blue-900/10' : ''}`}>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
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
          <button onClick={() => { setActiveMenu('dashboard'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeMenu === 'dashboard' && !selectedClass ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <LayoutDashboard size={20} /> Tổng Quan
          </button>
          <button onClick={() => { setActiveMenu('classes'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeMenu === 'classes' || selectedClass ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <BookOpen size={20} /> Lớp Học Của Tôi
          </button>
          <button onClick={() => { setActiveMenu('exams'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeMenu === 'exams' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <FileText size={20} /> Bài Kiểm Tra
          </button>
          <button onClick={() => { setActiveMenu('history'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeMenu === 'history' ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <TrendingUp size={20} /> Lịch Sử & Thống Kê
          </button>
          <button onClick={() => { setActiveMenu('notifications'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeMenu === 'notifications' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
            <Bell size={20} /> Thông Báo
            {dashData?.notifications?.some((n:any) => !n.read) && <div className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
          </button>
          <button onClick={() => { setActiveMenu('profile'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeMenu === 'profile' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
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
            {activeMenu === 'notifications' && !selectedClass && renderNotifications()}
            {activeMenu === 'profile' && !selectedClass && renderProfile()}
          </div>
        </main>
      </div>

      {selectedExam && renderExamRoom()}
    </div>
  );
};

export default Dashboard;
