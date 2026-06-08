import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuthStore } from '../store/useAuthStore';
import { teacherService, classService } from '../services/api';
import { useSessionState } from '../hooks/useSessionState';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, BookOpen, Users, BarChart3, Bot, User, ClipboardList,
  Search, Plus, Edit, Trash2, ChevronLeft, MessageSquare, List, Folder, Link as LinkIcon,
  Send, Eye, VolumeX, ShieldBan, ShieldCheck, Upload, FileSpreadsheet, Key, Image as ImageIcon, Sparkles, Star, ExternalLink, Sun, Moon, AlertTriangle,
  Archive, PenSquare, CheckCircle, XCircle, Clock, History, Cpu
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import AIPricingModal from '../components/AIPricingModal';
import { CourseOutlineManager } from '../components/CourseOutlineManager';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const TeacherDashboard = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    dob: '',
    cccd_number: '',
    id_card_image: '',
    certificate_image: ''
  });
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Layout State
  const [activeMenu, setActiveMenu] = useSessionState('teacherActiveMenu', 'dashboard');
  
  // Class Management State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useSessionState<any>('teacherSelectedClass', null);
  const [classDetailTab, setClassDetailTab] = useSessionState('teacherClassDetailTab', 'chat'); // chat, students, documents, ai

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Exam Management State
  const [examsList, setExamsList] = useState<any[]>([]);
  const [selectedExamForResults, setSelectedExamForResults] = useState<any>(null);
  const [selectedResultDetail, setSelectedResultDetail] = useState<any>(null);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Student Management State
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [editClassData, setEditClassData] = useState<any>(null);
  const [searchClass, setSearchClass] = useState('');
  const [newClassData, setNewClassData] = useState<{name: string, price: number, max_students: number, imageFile: File | null}>({ name: '', price: 0, max_students: 50, imageFile: null });
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Gradebook State
  const [gradebookData, setGradebookData] = useState<any>(null);
  const [gradebookLoading, setGradebookLoading] = useState(false);
  const [gradebookSearch, setGradebookSearch] = useState('');

  // Crop State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [targetForm, setTargetForm] = useState<'create' | 'edit' | null>(null);

  const onSelectFile = (e: any, formType: 'create' | 'edit') => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setTargetForm(formType);
        // Reset the input value so the same file can be selected again
        e.target.value = '';
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Document Management State
  const [documents, setDocuments] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Thư mục gốc'}]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [showCreateDocModal, setShowCreateDocModal] = useState(false);
  const [newDocData, setNewDocData] = useState<{name: string, type: 'Folder' | 'Link', link_url: string}>({name: '', type: 'Link', link_url: ''});

  // AI Chat State
  const [isAIChatActive, setIsAIChatActive] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);
  
  // AI Subscription State
  const [showAIPricing, setShowAIPricing] = useState(false);
  const [aiSubscriptionStatus, setAiSubscriptionStatus] = useState<any>(null);
  const [tokenHistory, setTokenHistory] = useState<any[]>([]);
  // MOCK DATA
  const [dashboardStats, setDashboardStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    currentRevenue: 0,
    growth: 0
  });

  const mockClasses = [
    { id: 'C001', name: 'Luyện Thi Đại Học Toán 12', students: 120, price: 500000, status: 'Active', isFeatured: true, image: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { id: 'C002', name: 'Vật Lý 11 Cơ Bản', students: 85, price: 300000, status: 'Active', isFeatured: true, image: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    { id: 'C003', name: 'Hóa Học 10 Nâng Cao', students: 140, price: 400000, status: 'Active', isFeatured: false, image: 'bg-gradient-to-br from-emerald-500 to-teal-500' },
    { id: 'C004', name: 'Toán 10 Chuyên Đề', students: 0, price: 450000, status: 'Draft', isFeatured: false, image: 'bg-gradient-to-br from-orange-500 to-red-500' },
  ];

  // Global Student Management State
  const [globalStudents, setGlobalStudents] = useState<any[]>([]);
  const [globalStudentSearch, setGlobalStudentSearch] = useState('');
  const [teacherRating, setTeacherRating] = useState<any>({ average: 0, count: 0, reviews: [] });

  const fetchSubscriptionStatus = async () => {
    try {
      const subRes = await teacherService.getSubscriptionStatus();
      if (subRes && subRes.success) {
        setAiSubscriptionStatus(subRes);
      }
    } catch(err) { console.error(err); }
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  useEffect(() => {
    if (user?.full_name) {
      import('../services/api').then(({ teacherRatingService }) => {
        setTeacherRating(teacherRatingService.getTeacherRatingDetails(user.full_name));
      });
    }
  }, [user?.full_name]);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);

  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [classRevenueDistribution, setClassRevenueDistribution] = useState<any[]>([]);
  const [statFilterType, setStatFilterType] = useState('year'); 
  const [statFilterYear, setStatFilterYear] = useState(new Date().getFullYear().toString());
  const [statFilterValue, setStatFilterValue] = useState(''); 

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  const mockChat = [
    { sender: 'Giáo viên', text: 'Chào các em, tuần này chúng ta sẽ kiểm tra 15p nhé.', time: '10:00 AM', isTeacher: true },
    { sender: 'Nguyễn Văn A', text: 'Dạ thầy, kiểm tra phần nào ạ?', time: '10:05 AM', isTeacher: false },
    { sender: 'Giáo viên', text: 'Chương 2 phần hàm số lũy thừa em nhé.', time: '10:06 AM', isTeacher: true },
  ];

  const mockDocuments = [
    { id: 1, name: 'Tài liệu Chương 1', type: 'folder' },
    { id: 2, name: 'Bài Tập Về Nhà - Tuần 1.pdf', type: 'file' },
  ];

  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatLogs, setAiChatLogs] = useState<{sender: string, text: string, questions?: any[]}[]>([
    { sender: 'FlyingClass AI', text: 'Xin chào! Tôi là trợ lý AI. Thầy/Cô có thể tải lên tài liệu để tôi giúp tạo bộ đề thi trắc nghiệm nhé!' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiAttachedFile, setAiAttachedFile] = useState<File | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ classLink: '', examName: '', startTime: '', endTime: '', durationMinutes: 45, maxAttempts: 1 });
  const [currentExamQuestions, setCurrentExamQuestions] = useState<any[]>([]);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [editExamData, setEditExamData] = useState({ title: '', startTime: '', endTime: '', durationMinutes: 45, maxAttempts: 1 });

  // --- CHAT HISTORY STATE ---
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [showChatSidebar, setShowChatSidebar] = useState(true);

  // --- EXAM BANK STATE ---
  const [examBankList, setExamBankList] = useState<any[]>([]);

  // --- MANUAL EXAM BUILDER STATE ---
  // View: 'list' | 'builder' | 'detail'
  const [examBankView, setExamBankView] = useState<'list' | 'builder' | 'detail'>('list');
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderDuration, setBuilderDuration] = useState(45);
  const [builderNumQ, setBuilderNumQ] = useState(5);
  const [builderStep, setBuilderStep] = useState<'setup' | 'questions'>('setup');
  const [builderQuestions, setBuilderQuestions] = useState<any[]>([]);
  const [pendingAiQuestions, setPendingAiQuestions] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeMenu === 'students') {
      fetchGlobalStudents();
    } else if (activeMenu === 'revenue') {
      fetchStatistics();
    } else if (activeMenu === 'dashboard') {
      fetchDashboardSummary();
    } else if (activeMenu === 'exams') {
      fetchTeacherExams();
    } else if (activeMenu === 'ai_assistant') {
      fetchChatSessions();
    } else if (activeMenu === 'exam_bank') {
      fetchExamBank();
    } else if (activeMenu === 'ai_management') {
      fetchTokenHistory();
    }
  }, [activeMenu, statFilterType, statFilterYear, statFilterValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeMenu === 'students') fetchGlobalStudents();
    }, 500);
    return () => clearTimeout(timer);
  }, [globalStudentSearch]);

  const fetchDashboardSummary = async () => {
    try {
      const data = await teacherService.getTeacherDashboardSummary();
      setDashboardStats({
        totalClasses: data?.total_classes || 0,
        totalStudents: data?.total_students || 0,
        currentRevenue: data?.current_revenue || 0,
        growth: data?.growth || 0
      });
    } catch(err) {
      console.error(err);
    }
  };

  const fetchTokenHistory = async () => {
    try {
      const res = await teacherService.getTokenUsageHistory(7);
      if (res && res.success) {
        setTokenHistory(res.data);
      }
    } catch(err) { console.error(err); }
  };

  const fetchTeacherExams = async () => {
    try {
      const res = await teacherService.getTeacherExams();
      setExamsList(res?.success ? res.message : (Array.isArray(res) ? res : []));
    } catch(err) { console.error(err); setExamsList([]); }
  };

  // --- CHAT SESSION FUNCTIONS ---
  const fetchChatSessions = async () => {
    try {
      await fetchSubscriptionStatus();
      const res = await teacherService.getChatSessions();
      if (res?.success) setChatSessions(res.data || []);
    } catch(err) { console.error(err); }
  };

  const handleLoadSession = async (sessionName: string) => {
    try {
      const res = await teacherService.getChatHistory(sessionName);
      if (res?.success) {
        const msgs = (res.data || []).map((m: any) => ({
          sender: m.role === 'User' ? 'Bạn' : 'FlyingClass AI',
          text: m.content,
          questions: undefined
        }));
        setAiChatLogs(msgs.length ? msgs : [{ sender: 'FlyingClass AI', text: 'Lịch sử trống.' }]);
        setCurrentSessionName(sessionName);
      }
    } catch(err) { console.error(err); }
  };

  const handleNewChatSession = () => {
    setCurrentSessionName(null);
    setAiChatLogs([{ sender: 'FlyingClass AI', text: 'Xin chào! Tôi là trợ lý AI. Thầy/Cô có thể tải lên tài liệu để tôi giúp tạo bộ đề thi trắc nghiệm nhé!' }]);
  };

  // --- EXAM BANK FUNCTIONS ---
  const fetchExamBank = async () => {
    try {
      const res = await teacherService.getTeacherExams();
      setExamBankList(res?.success ? res.message : (Array.isArray(res) ? res : []));
    } catch(err) { setExamBankList([]); }
  };

  const initBuilderFromAI = (questions: any[]) => {
    const mapped = questions.map((q: any) => ({
      question_text: q.question_text || q.question || '',
      options: [
        q.option_a || '',
        q.option_b || '',
        q.option_c || '',
        q.option_d || ''
      ].filter(Boolean),
      correctIndex: ['A','B','C','D'].indexOf(q.correct_answer || q.correct || 'A')
    }));
    setBuilderQuestions(mapped);
    setBuilderTitle('');
    setBuilderDuration(45);
    setBuilderStep('questions');
    setExamBankView('builder');
    setActiveMenu('exam_bank');
  };

  const handleInitManualBuilder = () => {
    const qs = Array.from({ length: builderNumQ }, () => ({
      question_text: '',
      options: ['', '', '', ''],
      correctIndex: 0
    }));
    setBuilderQuestions(qs);
    setBuilderStep('questions');
  };

  const handleSaveExamToBank = async (andAssign = false) => {
    if (!builderTitle.trim()) { alert('Vui lòng nhập tên đề thi!'); return; }
    if (builderQuestions.some(q => !q.question_text.trim())) { alert('Vui lòng điền nội dung tất cả câu hỏi!'); return; }

    const apiQuestions = builderQuestions.map((q) => ({
      question_text: q.question_text,
      options_json: JSON.stringify(q.options),
      correct_option_index: q.correctIndex,
      // legacy compat
      option_a: q.options[0] || '',
      option_b: q.options[1] || '',
      option_c: q.options[2] || '',
      option_d: q.options[3] || '',
      correct_option: ['A','B','C','D'][q.correctIndex] || 'A'
    }));

    try {
      await teacherService.saveExamToBank(builderTitle, builderDuration, apiQuestions);
      alert('Đã lưu đề thi vào Kho đề thành công!');
      if (andAssign) {
        setCurrentExamQuestions(apiQuestions);
        setScheduleData(prev => ({ ...prev, examName: builderTitle }));
        setShowScheduleModal(true);
      }
      setExamBankView('list');
      setBuilderStep('setup');
      fetchExamBank();
    } catch(err) {
      alert('Lỗi khi lưu đề thi!');
    }
  };

  // --- EXAM BANK: EDIT & DELETE ---
  const [editingBankExam, setEditingBankExam] = useState<any>(null);

  const handleDeleteExamFromBank = async (examName: string, examTitle: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đề thi "${examTitle}" khỏi kho không?`)) return;
    try {
      await teacherService.deleteExamFromBank(examName);
      fetchExamBank();
    } catch(err) {
      alert('Lỗi khi xóa đề thi!');
    }
  };

  const handleOpenEditExamBank = (exam: any) => {
    // Parse questions from the exam object into builder format
    const qs = (exam.questions || []).map((q: any) => {
      let options: string[];
      try {
        options = q.options_json ? JSON.parse(q.options_json) : [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''].filter(Boolean);
      } catch { options = [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''].filter(Boolean); }
      const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const correctIndex = q.correct_option_index ?? (letterMap[q.correct_option] ?? 0);
      return { question_text: q.question_text || '', options, correctIndex };
    });
    setEditingBankExam(exam);
    setBuilderTitle(exam.title || '');
    setBuilderDuration(exam.duration || 45);
    setBuilderQuestions(qs);
    setExamBankView('builder');
    setBuilderStep('questions');
  };

  const handleUpdateExamInBank = async (andAssign = false) => {
    if (!builderTitle.trim()) { alert('Vui lòng nhập tên đề thi!'); return; }
    if (builderQuestions.some(q => !q.question_text.trim())) { alert('Vui lòng điền nội dung tất cả câu hỏi!'); return; }
    const apiQuestions = builderQuestions.map((q) => ({
      question_text: q.question_text,
      options_json: JSON.stringify(q.options),
      correct_option_index: q.correctIndex,
      option_a: q.options[0] || '', option_b: q.options[1] || '',
      option_c: q.options[2] || '', option_d: q.options[3] || '',
      correct_option: ['A','B','C','D'][q.correctIndex] || 'A'
    }));
    try {
      await teacherService.updateExamInBank(editingBankExam.name, builderTitle, builderDuration, apiQuestions);
      alert('Đã cập nhật đề thi thành công!');
      if (andAssign) {
        setCurrentExamQuestions(apiQuestions);
        setScheduleData(prev => ({ ...prev, examName: builderTitle }));
        setShowScheduleModal(true);
      }
      setEditingBankExam(null);
      setExamBankView('list');
      setBuilderStep('setup');
      fetchExamBank();
    } catch(err) { alert('Lỗi khi cập nhật đề thi!'); }
  };

  const fetchExamResultsForTeacher = async (exam: any) => {
    try {
      const res = await teacherService.getExamResultsForTeacher(exam.name);
      setExamResults(res?.success ? res.message : (Array.isArray(res) ? res : []));
      setSelectedExamForResults(exam);
    } catch(err) { console.error(err); setExamResults([]); }
  };

  const fetchStatistics = async () => {
    try {
      const data = await teacherService.getTeacherStatistics(statFilterType, statFilterValue, statFilterYear);
      setRevenueData(data?.revenue_data || []);
      setClassRevenueDistribution(data?.class_distribution || []);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchGlobalStudents = async () => {
    try {
      const students = await teacherService.getGlobalStudents(globalStudentSearch);
      setGlobalStudents(students || []);
    } catch(err) {
      console.error(err);
      setGlobalStudents([]);
    }
  };

  const handleGlobalKickStudent = async (studentEmail: string, studentName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa học viên ${studentName} khỏi TẤT CẢ các lớp học?`)) {
      try {
        await teacherService.kickStudentGlobal(studentEmail);
        fetchGlobalStudents();
      } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa học sinh');
      }
    }
  };

  const handleGlobalMuteStudent = async (studentEmail: string, currentMuted: number) => {
    try {
      await teacherService.toggleStudentChatGlobal(studentEmail, currentMuted === 1 ? 0 : 1);
      fetchGlobalStudents();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi cập nhật trạng thái chat');
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getMyClasses();
      if (res && res.classes) {
        const formatted = res.classes.map((c: any, i: number) => ({
          id: c.class_id,
          name: c.class_name,
          code: c.class_code,
          status: c.status,
          price: c.price || 500000,
          students: c.student_count || 0,
          max_students: c.max_students || 50,
          isFeatured: i < 2, // just make first 2 featured
          image: c.image || ['bg-gradient-to-br from-blue-500 to-cyan-500', 'bg-gradient-to-br from-purple-500 to-pink-500', 'bg-gradient-to-br from-emerald-500 to-teal-500', 'bg-gradient-to-br from-orange-500 to-red-500'][i % 4],
          imageIsUrl: !!c.image
        }));
        setClasses(formatted.length > 0 ? formatted : mockClasses);
      }
    } catch(err) {
      console.error("Failed to fetch classes", err);
      setClasses(mockClasses);
    }
  };

  const fetchClassGradebook = async () => {
    if(!selectedClass) return;
    try {
      setGradebookLoading(true);
      const res = await teacherService.getClassGradebook(selectedClass.id);
      setGradebookData(res);
    } catch(err) {
      console.error(err);
    } finally {
      setGradebookLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!gradebookData) return;
    const headers = ['Học sinh', 'Email', ...(gradebookData.exams || []).map((e: any) => e.title)];
    const rows = (gradebookData.students || []).map((s: any) => {
      const studentGrades = (gradebookData.grades || {})[s.email] || {};
      return [
        s.full_name,
        s.email,
        ...(gradebookData.exams || []).map((e: any) => {
          const score = studentGrades[e.name];
          return score !== undefined ? score : '-';
        })
      ];
    });
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map((val: any) => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bang_Diem_${selectedClass.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (selectedClass && classDetailTab === 'chat') {
      fetchChatMessages();
    }
    if (selectedClass && classDetailTab === 'students') {
      fetchClassStudents();
    }
    if (selectedClass && classDetailTab === 'course_outline') {
      // CourseOutlineManager handles its own data fetching
    }
    if (selectedClass && classDetailTab === 'gradebook') {
      fetchClassGradebook();
    }
  }, [selectedClass, classDetailTab, currentFolderId]);

  const fetchDocuments = async () => {
    if(!selectedClass) return;
    try {
      const docs = await classService.getClassDocuments(selectedClass.id, currentFolderId);
      setDocuments(docs);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchClassStudents = async () => {
    if(!selectedClass) return;
    if (selectedClass.id.startsWith('C00')) {
      setClassStudents([]);
      return;
    }
    try {
      const res = await classService.getClassStudents(selectedClass.id);
      setClassStudents(res.students);
    } catch(err) {
      console.error(err);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassData.name) return;
    try {
      let imageUrl = '';
      if (newClassData.imageFile) {
        imageUrl = await classService.uploadFile(newClassData.imageFile);
      }
      const generatedCode = 'CLS' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await classService.createClass(newClassData.name, generatedCode, newClassData.price, newClassData.max_students, imageUrl);
      setShowCreateClass(false);
      setNewClassData({ name: '', price: 0, max_students: 50, imageFile: null });
      fetchClasses();
      alert("Tạo lớp thành công!");
    } catch(err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi tạo lớp");
    }
  };

  const handleEditClassSubmit = async () => {
    if (!editClassData?.name) return;
    try {
      let imageUrl = editClassData.imageIsUrl ? editClassData.image : '';
      if (editClassData.imageFile) {
        imageUrl = await classService.uploadFile(editClassData.imageFile);
      }
      await classService.updateClass(editClassData.id, editClassData.name, editClassData.code, editClassData.price, editClassData.max_students, imageUrl);
      setShowEditClass(false);
      setEditClassData(null);
      fetchClasses();
      alert("Cập nhật lớp thành công!");
    } catch(err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi cập nhật lớp");
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa lớp học này?")) {
      try {
        await classService.deleteClass(classId);
        fetchClasses();
        alert("Xóa lớp học thành công!");
      } catch(err: any) {
        alert(err.response?.data?.message || err.message || "Lỗi xóa lớp");
      }
    }
  };

  const handleAddStudent = async () => {
    if(!newStudentEmail.trim()) return;
    if (selectedClass.id.startsWith('C00')) {
      alert("Không thể thêm học sinh vào lớp học mẫu. Vui lòng thử trên lớp học do bạn tạo ra.");
      return;
    }
    try {
      await classService.addStudent(selectedClass.id, newStudentEmail);
      setNewStudentEmail('');
      setShowAddStudent(false);
      fetchClassStudents();
    } catch(err: any) {
      alert(err.response?.data?.message || err.message || 'Error adding student');
    }
  };

  const handleRemoveStudent = async (email: string) => {
    if(window.confirm('Bạn có chắc chắn muốn kick học sinh này?')) {
      try {
        await classService.removeStudent(selectedClass.id, email);
        fetchClassStudents();
      } catch(err: any) {
        alert(err.response?.data?.message || err.message || 'Error');
      }
    }
  };

  const handleToggleMute = async (email: string, currentMuteStatus: number) => {
    try {
      await classService.toggleStudentChat(selectedClass.id, email, currentMuteStatus ? 0 : 1);
      fetchClassStudents();
    } catch(err: any) {
      alert(err.response?.data?.message || err.message || 'Error');
    }
  };

  const handleViewProfile = async (email: string) => {
    try {
      const res = await classService.getStudentProfile(email);
      setStudentProfile(res);
    } catch(err: any) {
      alert(err.response?.data?.message || err.message || 'Error');
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const emails = results.data.map((row: any) => row.Email || row.email).filter(Boolean);
        if(emails.length === 0) {
          alert('Không tìm thấy cột Email hoặc email trong file (chữ đầu viết hoa hoặc thường).');
          return;
        }
        try {
          const res = await classService.importStudents(selectedClass.id, emails);
          alert(res.message);
          fetchClassStudents();
        } catch(err: any) {
          alert(err.response?.data?.message || err.message || 'Error importing');
        }
      }
    });
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    if(classStudents.length === 0) return;
    
    // Chuẩn bị dữ liệu
    const dataToExport = classStudents.map(s => ({
      "Họ Tên": s.full_name,
      "Email": s.email,
      "Trạng thái Mute": s.is_muted === 1 ? "Bị Mute" : "Bình thường"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Học Sinh");
    
    // Độ rộng cột
    const wscols = [
      {wch: 30},
      {wch: 35},
      {wch: 15}
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `DanhSachHocSinh_${selectedClass.id}.xlsx`);
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

  const handleCreateDocument = async () => {
    if(!newDocData.name.trim()) return;
    if(newDocData.type === 'Link' && !newDocData.link_url.trim()) return;
    try {
      await classService.createDocument(selectedClass.id, newDocData.name, newDocData.type, currentFolderId, newDocData.link_url);
      setShowCreateDocModal(false);
      setNewDocData({name: '', type: 'Link', link_url: ''});
      fetchDocuments();
    } catch(err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi tạo tài liệu");
    }
  };
  
  const handleDeleteDocument = async (id: string, e: any) => {
    e.stopPropagation();
    if(confirm('Bạn có chắc muốn xóa?')) {
      try {
         await classService.deleteDocument(id);
         fetchDocuments();
         if(selectedDocument?.id === id) setSelectedDocument(null);
      } catch(err) {}
    }
  };

  useEffect(() => {
    if (aiMessagesEndRef.current) {
      aiMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAILoading]);

  const handleSendAIMessage = async () => {
    if (!aiInput.trim() || !selectedClass) return;
    const userMessage = aiInput;
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsAILoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE");
      const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: `Bạn là trợ lý AI chuyên môn cao của lớp học "${selectedClass.name}". Nhiệm vụ của bạn là hỗ trợ giáo viên giải đáp kiến thức, soạn đề kiểm tra, tóm tắt bài giảng. Hãy trả lời thân thiện, ngắn gọn và tập trung vào chuyên môn của lớp ${selectedClass.name}.`
      });

      const history = aiMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const text = response.text();

      setAiMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error: any) {
      console.error(error);
      setAiMessages(prev => [...prev, { role: 'model', text: `Xin lỗi, tôi đang gặp sự cố kết nối tới Gemini API: ${error.message || JSON.stringify(error)}` }]);
    } finally {
      setIsAILoading(false);
    }
  };

  const fetchChatMessages = async () => {
    try {
      setChatLoading(true);
      const msgs = await classService.getChatMessages(selectedClass.id);
      setChatMessages(msgs.messages);
    } catch (err) {
      console.error("Fetch chat failed, falling back to mock", err);
      if (selectedClass?.id.startsWith('C00')) {
        setChatMessages(mockChat.map(m => ({
          id: Math.random(),
          sender: m.sender,
          is_teacher: m.isTeacher,
          message: m.text,
          time: m.time
        })));
      } else {
        setChatMessages([]);
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;
    try {
      await classService.sendChatMessage(selectedClass.id, chatInput);
      setChatInput('');
      fetchChatMessages(); // re-fetch
    } catch (err) {
      console.error("Send message failed, mock update", err);
      setChatMessages(prev => [...prev, {
         id: Math.random(),
         sender: user?.full_name || 'Giáo viên',
         is_teacher: true,
         message: chatInput,
         time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
      setChatInput('');
    }
  };

  const fetchProfile = async () => {
    try {
      const myProfile = await teacherService.getProfile();
      setProfile(myProfile);
      if (myProfile) {
        setProfileForm({
          full_name: myProfile.full_name || user?.full_name || '',
          phone: myProfile.phone || '',
          dob: myProfile.dob || '',
          cccd_number: myProfile.cccd_number || '',
          id_card_image: myProfile.id_card_image || '',
          certificate_image: myProfile.certificate_image || ''
        });
      } else {
        setProfileForm(prev => ({ ...prev, full_name: user?.full_name || '' }));
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      let idCardUrl = profileForm.id_card_image;
      let certUrl = profileForm.certificate_image;
      
      if (idCardFile) {
        idCardUrl = await classService.uploadFile(idCardFile);
      }
      if (certFile) {
        certUrl = await classService.uploadFile(certFile);
      }
      
      const res: any = await teacherService.updateProfile(
        profileForm.full_name,
        idCardUrl,
        certUrl,
        profileForm.dob,
        profileForm.cccd_number,
        profileForm.phone,
        avatarData || undefined
      );
      
      if (res && res.success === false) {
        throw new Error(res.message || "Cập nhật thất bại");
      }
      
      alert("Cập nhật hồ sơ thành công! Đang chờ duyệt.");
      fetchProfile();
      useAuthStore.getState().checkAuth();
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi cập nhật hồ sơ!");
    }
  };

  const handleSendAiMessage = async (overrideText?: string) => {
    const textToSend = overrideText || aiChatInput;
    if (!textToSend.trim() && !aiAttachedFile) return;
    const userMsg = aiAttachedFile ? `[Đã đính kèm: ${aiAttachedFile.name}]\n${textToSend}` : textToSend;
    setAiChatLogs(prev => [...prev, { sender: 'Bạn', text: userMsg }]);
    
    const match = textToSend.match(/(\d+)\s*câu/i);
    const numQuestions = match ? parseInt(match[1]) : 5;
    
    setAiChatInput('');
    setAiAttachedFile(null);
    setIsAiTyping(true);
    
    // Auto-create session on first message
    let sessionName = currentSessionName;
    try {
      if (!sessionName) {
        const shortTitle = textToSend.slice(0, 60) || 'Phiên chat mới';
        const sessionRes = await teacherService.createChatSession(shortTitle);
        if (sessionRes?.success) {
          sessionName = sessionRes.data.name;
          setCurrentSessionName(sessionName);
          fetchChatSessions();
        }
      }
      if (sessionName) {
        await teacherService.saveChatMessage(sessionName, 'User', userMsg);
      }
    } catch(_) {}
    
    try {
      const res = await teacherService.generateMockExam(userMsg, numQuestions, aiAttachedFile);
      
      if (res.code === 'AI_EXPIRED' || res.code === 'AI_TRIAL_EXHAUSTED' || (!res.success && res.message?.includes('hết hạn'))) {
        setShowAIPricing(true);
        setAiChatLogs(prev => [...prev, { sender: 'FlyingClass AI', text: res.message || 'Bạn đã dùng hết lượt trải nghiệm AI. Vui lòng đăng ký để tiếp tục.' }]);
        setIsAiTyping(false);
        return;
      }
      
      const aiText = res.message || '';
      const aiQuestions = res.data || [];
      setAiChatLogs(prev => [...prev, { sender: 'FlyingClass AI', text: aiText, questions: aiQuestions }]);
      if (sessionName) {
        await teacherService.saveChatMessage(sessionName, 'AI', aiText).catch(() => {});
      }
    } catch (err) {
      setAiChatLogs(prev => [...prev, { sender: 'FlyingClass AI', text: 'Xin lỗi, đã xảy ra lỗi khi tạo đề thi.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };


  const handleOpenScheduleModal = (questions: any[]) => {
    setCurrentExamQuestions(questions);
    setShowScheduleModal(true);
  };

  const handleScheduleExam = async () => {
    if (!scheduleData.classLink || !scheduleData.examName) {
      alert("Vui lòng điền tên đề thi và chọn lớp.");
      return;
    }
    if (scheduleData.endTime && new Date(scheduleData.endTime) < new Date()) {
      alert("Không thể đặt thời gian kết thúc ở quá khứ.");
      return;
    }
    try {
      await teacherService.saveExamSchedule(
        scheduleData.examName, scheduleData.classLink, 
        scheduleData.startTime.replace('T', ' '), scheduleData.endTime.replace('T', ' '), 
        scheduleData.durationMinutes, currentExamQuestions, scheduleData.maxAttempts
      );
      setShowScheduleModal(false);
      setScheduleData({ classLink: '', examName: '', startTime: '', endTime: '', durationMinutes: 45, maxAttempts: 1 });
      alert("Đã lưu & giao đề thi thành công!");
    } catch (err) {
      alert("Lỗi khi giao đề thi.");
    }
  };

  const handleOpenEditExam = (exam: any) => {
    setEditingExam(exam);
    setEditExamData({
      title: exam.title || '',
      startTime: exam.start_time ? new Date(exam.start_time).toISOString().slice(0, 16) : '',
      endTime: exam.end_time ? new Date(exam.end_time).toISOString().slice(0, 16) : '',
      durationMinutes: exam.duration || 45,
      maxAttempts: exam.max_attempts || 1
    });
  };

  const handleSaveEditExam = async () => {
    if (editExamData.endTime && new Date(editExamData.endTime) < new Date()) {
      alert("Không thể đặt thời gian kết thúc ở quá khứ.");
      return;
    }
    try {
      const st = editExamData.startTime ? editExamData.startTime.replace('T', ' ') : '';
      const et = editExamData.endTime ? editExamData.endTime.replace('T', ' ') : '';
      await teacherService.editExamSchedule(
        editingExam.name, editExamData.title, 
        st, et, 
        editExamData.durationMinutes, editExamData.maxAttempts
      );
      setEditingExam(null);
      alert("Đã cập nhật đề thi thành công!");
      fetchTeacherExams();
    } catch (err: any) {
      console.error(err);
      alert("Lỗi khi cập nhật đề thi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleExamStatus = async (exam: any) => {
    try {
      const res = await teacherService.toggleExamStatus(exam.name);
      if (res.success) {
        alert(res.message);
        fetchTeacherExams();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi khi thay đổi trạng thái.');
    }
  };

  const handleCloseAllExams = async () => {
    if (!confirm('Đóng tất cả các bài thi đang mở? Học sinh sẽ không thể làm bài nữa.')) return;
    try {
      const res = await teacherService.closeAllExams();
      if (res.success) {
        alert(res.message);
        fetchTeacherExams();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert('Lỗi khi đóng bài thi.');
    }
  };

  const handleCloseExam = async (exam_id: string) => {
    if (!confirm('Bạn có chắc chắn muốn đóng bài thi này?')) return;
    try {
      const res = await teacherService.closeExam(exam_id);
      alert(res.message);
      fetchTeacherExams();
    } catch (err) {
      alert('Lỗi khi đóng bài thi.');
    }
  };

  const handleViewResultDetail = async (result_id: string) => {
    try {
      const res = await teacherService.getExamResultDetail(result_id);
      setSelectedResultDetail(res);
    } catch (err) {
      alert('Lỗi khi tải chi tiết bài làm.');
    }
  };

  // --- RENDER FUNCTIONS ---

  const renderExamManagement = () => {
    const uniqueClasses = Array.from(new Set(examsList?.map(e => e.class_name).filter(Boolean)));
    const filteredExams = selectedClass ? examsList?.filter(e => e.class_name === selectedClass.name || e.class_ref === selectedClass.id) : examsList;

    return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quản Lý Bài Thi</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleCloseAllExams} className="bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold transition inline-flex items-center shadow-lg shadow-red-500/20">
            <ShieldBan size={16} className="mr-2" /> Đóng Tất Cả
          </button>
          <select 
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg outline-none focus:border-blue-500"
          onChange={(e) => {
            const val = e.target.value;
            if (!val) setSelectedClass(null);
            else setSelectedClass({name: val, id: val}); // Using a mock object just for filtering by name
          }}
          value={selectedClass ? selectedClass.name : ""}
        >
          <option value="">Tất cả các lớp</option>
          {uniqueClasses.map((cls: any) => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
          </select>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-[70vh] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-4 font-bold">Tên Bài Thi</th>
              <th className="px-4 py-4 font-bold">Lớp</th>
              <th className="px-4 py-4 font-bold text-center">Thời Lượng</th>
              <th className="px-4 py-4 font-bold text-center">Thời Gian Mở</th>
              <th className="px-4 py-4 font-bold text-center">Thời Gian Đóng</th>
              <th className="px-4 py-4 font-bold text-center">Lượt Thi</th>
              <th className="px-4 py-4 font-bold text-center">Trạng Thái</th>
              <th className="px-4 py-4 font-bold text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredExams?.map(exam => (
              <tr key={exam.name} className="hover:bg-slate-100/30 dark:bg-slate-700/30 transition">
                <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">{exam.title}</td>
                <td className="px-4 py-4 text-slate-600 dark:text-slate-400">{exam.class_name || 'N/A'}</td>
                <td className="px-4 py-4 text-center text-blue-400 font-mono">{exam.duration} phút</td>
                <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-400 text-xs">{exam.start_time ? new Date(exam.start_time).toLocaleString('vi-VN') : <span className="text-yellow-400">Thủ công</span>}</td>
                <td className="px-4 py-4 text-center text-slate-600 dark:text-slate-400 text-xs">{exam.end_time ? new Date(exam.end_time).toLocaleString('vi-VN') : <span className="text-yellow-400">Thủ công</span>}</td>
                <td className="px-4 py-4 text-center"><span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full text-xs font-semibold">{exam.max_attempts || 1} lần</span></td>
                <td className="px-4 py-4 text-center">
                  {(() => {
                    const isExpired = exam.end_time && new Date(exam.end_time) < new Date();
                    const statusText = exam.status === 'Completed' ? 'Đã đóng' : isExpired ? 'Hết hạn' : 'Đang mở';
                    const statusClass = (exam.status === 'Completed' || isExpired) ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400';
                    return (
                      <button onClick={() => handleToggleExamStatus(exam)} className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition hover:opacity-80 ${statusClass}`}>
                        {statusText}
                      </button>
                    );
                  })()}
                </td>
                <td className="px-4 py-4 text-right">
                  <button onClick={() => fetchExamResultsForTeacher(exam)} className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-500/20 inline-flex items-center mr-2">
                    <Eye size={14} className="mr-1" /> Xem Điểm
                  </button>
                  <button onClick={() => handleOpenEditExam(exam)} className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-500/20 inline-flex items-center mr-2">
                    <Edit size={14} className="mr-1" /> Sửa
                  </button>
                  {exam.status !== 'Completed' && !(exam.end_time && new Date(exam.end_time) < new Date()) && (
                    <button onClick={() => handleCloseExam(exam.name)} className="bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-red-500/20 inline-flex items-center">
                      <ShieldBan size={14} className="mr-1" /> Đóng
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {(!filteredExams || filteredExams.length === 0) && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Chưa có bài thi nào phù hợp.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  };

  const handleExportExamResults = (results: any[], examName: string) => {
    if (!results || results.length === 0) {
      alert("Không có dữ liệu điểm để xuất!");
      return;
    }

    const exportData = results.map(r => ({
      "Học Sinh": r.student_name || r.student_email,
      "Email": r.student_email,
      "Điểm Số": r.score,
      "Tổng Câu": r.total_questions || 0,
      "Câu Đúng": r.correct_answers || 0,
      "Ngày Nộp": r.submitted_at || 'N/A',
      "Vi Phạm (Mở tab/Thoát)": localStorage.getItem(`fc_violation_${selectedExamForResults?.name}`) || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Diem_Thi");
    XLSX.writeFile(workbook, `Diem_Thi_${examName.replace(/\s+/g, '_')}.xlsx`);
  };

  const renderExamResults = () => {
    let avgScore = 0, maxScore = 0, minScore = 0, passRate = 0;
    if (examResults && examResults.length > 0) {
      const scores = examResults.map(r => r.score);
      avgScore = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2));
      maxScore = Math.max(...scores);
      minScore = Math.min(...scores);
      passRate = Number(((scores.filter(s => s >= 5).length / scores.length) * 100).toFixed(1));
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedExamForResults(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition flex items-center bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <ChevronLeft size={16} className="mr-1" /> Quay lại
            </button>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Điểm Thi: <span className="text-emerald-400">{selectedExamForResults.title}</span></h2>
          </div>
          <button 
            onClick={() => handleExportExamResults(examResults, selectedExamForResults.title)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition font-bold"
          >
            <FileSpreadsheet size={18} /> Xuất Excel
          </button>
        </div>

        {/* Thống kê điểm */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Tổng Lượt Nộp</p>
            <p className="text-3xl font-bold text-blue-500">{examResults?.length || 0}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Điểm Trung Bình</p>
            <p className="text-3xl font-bold text-yellow-500">{avgScore}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Điểm Cao Nhất</p>
            <p className="text-3xl font-bold text-emerald-500">{maxScore}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center items-center">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Tỉ Lệ Đạt (&gt;=5)</p>
            <p className="text-3xl font-bold text-purple-500">{passRate}%</p>
          </div>
        </div>

        {/* Biểu đồ phân bố điểm */}
        {examResults && examResults.length > 0 && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phân Bố Điểm Số</h3>
              <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button onClick={() => setChartType('bar')} className={`px-3 py-1 text-sm font-medium rounded-md transition ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Biểu đồ Cột</button>
                <button onClick={() => setChartType('line')} className={`px-3 py-1 text-sm font-medium rounded-md transition ${chartType === 'line' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Biểu đồ Thẳng</button>
                <button onClick={() => setChartType('pie')} className={`px-3 py-1 text-sm font-medium rounded-md transition ${chartType === 'pie' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Biểu đồ Tròn</button>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={[
                      { name: 'Dưới 5', count: examResults.filter(r => r.score < 5).length, fill: '#ef4444' },
                      { name: '5 - 6.5', count: examResults.filter(r => r.score >= 5 && r.score < 7).length, fill: '#eab308' },
                      { name: '7 - 8', count: examResults.filter(r => r.score >= 7 && r.score <= 8).length, fill: '#3b82f6' },
                      { name: '8.5 - 10', count: examResults.filter(r => r.score > 8).length, fill: '#10b981' }
                    ]}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b'}} allowDecimals={false} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    <Bar dataKey="count" name="Số học sinh" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart
                    data={[
                      { name: 'Dưới 5', count: examResults.filter(r => r.score < 5).length },
                      { name: '5 - 6.5', count: examResults.filter(r => r.score >= 5 && r.score < 7).length },
                      { name: '7 - 8', count: examResults.filter(r => r.score >= 7 && r.score <= 8).length },
                      { name: '8.5 - 10', count: examResults.filter(r => r.score > 8).length }
                    ]}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{fill: '#64748b'}} />
                    <YAxis stroke="#64748b" tick={{fill: '#64748b'}} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{r: 6, fill: '#10b981'}} activeDot={{r: 8}} name="Số học sinh" />
                  </LineChart>
                ) : (
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={[
                        { name: 'Dưới 5', count: examResults.filter(r => r.score < 5).length, fill: '#ef4444' },
                        { name: '5 - 6.5', count: examResults.filter(r => r.score >= 5 && r.score < 7).length, fill: '#eab308' },
                        { name: '7 - 8', count: examResults.filter(r => r.score >= 7 && r.score <= 8).length, fill: '#3b82f6' },
                        { name: '8.5 - 10', count: examResults.filter(r => r.score > 8).length, fill: '#10b981' }
                      ].filter(d => d.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="name"
                      label={({name, percent}) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      {[
                        { name: 'Dưới 5', count: examResults.filter(r => r.score < 5).length, fill: '#ef4444' },
                        { name: '5 - 6.5', count: examResults.filter(r => r.score >= 5 && r.score < 7).length, fill: '#eab308' },
                        { name: '7 - 8', count: examResults.filter(r => r.score >= 7 && r.score <= 8).length, fill: '#3b82f6' },
                        { name: '8.5 - 10', count: examResults.filter(r => r.score > 8).length, fill: '#10b981' }
                      ].filter(d => d.count > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">Học Sinh</th>
                <th className="px-6 py-4 font-bold text-center">Câu Đúng</th>
                <th className="px-6 py-4 font-bold text-center">Điểm Số</th>
                <th className="px-6 py-4 font-bold text-center text-red-400">Vi Phạm</th>
                <th className="px-6 py-4 font-bold text-right">Ngày Nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {examResults?.map(r => (
                <tr key={r.name} onClick={() => handleViewResultDetail(r.name)} className="hover:bg-slate-100/30 dark:bg-slate-700/30 transition cursor-pointer">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">{(r.student_name || 'U').charAt(0)}</div>
                    {r.student_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-slate-600 dark:text-slate-400">{r.correct_answers}/{r.total_questions}</td>
                  <td className="px-6 py-4 text-center">
                     <span className={`font-bold text-lg ${r.score >= 8 ? 'text-emerald-400' : r.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{r.score}</span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-red-500 bg-red-500/5">{localStorage.getItem(`fc_violation_${selectedExamForResults.name}`) || 0}</td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400 text-xs">{new Date(r.creation).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
              {(!examResults || examResults.length === 0) && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chưa có học sinh nào nộp bài.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Xem chi tiết bài làm */}
        {selectedResultDetail && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-500" /> 
                  Chi Tiết Bài Làm: <span className="text-emerald-400">{selectedResultDetail.student_name}</span>
                </h2>
                <button onClick={() => setSelectedResultDetail(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                  <ExternalLink size={20} className="rotate-180" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex gap-6 mb-6">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
                    <p className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Thời Gian Bắt Đầu</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {selectedResultDetail.start_time ? new Date(selectedResultDetail.start_time).toLocaleString('vi-VN') : 'Không ghi nhận'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
                    <p className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Thời Gian Nộp Bài</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {selectedResultDetail.submitted_at ? new Date(selectedResultDetail.submitted_at).toLocaleString('vi-VN') : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 flex flex-col justify-center items-center">
                    <p className="text-slate-500 text-xs font-semibold mb-1 uppercase tracking-wider">Điểm Số</p>
                    <p className={`font-bold text-2xl ${selectedResultDetail.score >= 8 ? 'text-emerald-400' : selectedResultDetail.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {selectedResultDetail.score}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedResultDetail.questions?.map((q: any, i: number) => {
                    const isCorrect = q.student_answer === q.correct_option;
                    const isUnanswered = !q.student_answer;
                    
                    return (
                      <div key={q.id} className={`p-5 rounded-xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : isUnanswered ? 'bg-slate-500/5 border-slate-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                        <div className="flex gap-3 mb-4">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : isUnanswered ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 pt-1">
                            <p className="font-medium text-slate-900 dark:text-white mb-1" dangerouslySetInnerHTML={{ __html: q.question_text }} />
                            {!isCorrect && (
                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2">
                                <span className="bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded text-xs">Đáp án đúng:</span> {q[`option_${q.correct_option}`]}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-11">
                          {['a', 'b', 'c', 'd'].map((opt) => {
                            if (!q[`option_${opt}`]) return null;
                            const isSelected = q.student_answer === opt;
                            const isCorrectOpt = q.correct_option === opt;
                            
                            let optClass = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400';
                            if (isSelected && isCorrectOpt) optClass = 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm';
                            else if (isSelected && !isCorrectOpt) optClass = 'bg-red-50 dark:bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 font-medium shadow-sm';
                            else if (isCorrectOpt) optClass = 'border-emerald-500/50 text-emerald-600 dark:text-emerald-500';
                            
                            return (
                              <div key={opt} className={`p-3 rounded-lg border flex items-start gap-2 ${optClass}`}>
                                <span className="font-semibold uppercase w-5">{opt}.</span>
                                <span className="flex-1" dangerouslySetInnerHTML={{ __html: q[`option_${opt}`] }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tổng Quan (Dashboard)</h2>
      
      {/* Thẻ thống kê */}
      <div className="grid grid-cols-4 gap-6">
        <div onClick={() => setActiveMenu('classes')} className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex items-center cursor-pointer hover:border-slate-500 transition-colors">
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-xl mr-4"><BookOpen size={28} /></div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng Lớp Học</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{dashboardStats.totalClasses}</h3>
          </div>
        </div>
        <div onClick={() => setActiveMenu('students')} className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex items-center cursor-pointer hover:border-slate-500 transition-colors">
          <div className="p-4 bg-purple-500/10 text-purple-400 rounded-xl mr-4"><Users size={28} /></div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Tổng Học Sinh</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{dashboardStats.totalStudents}</h3>
          </div>
        </div>
        <div onClick={() => setActiveMenu('revenue')} className="col-span-2 bg-gradient-to-r from-emerald-900/40 to-teal-900/40 p-6 rounded-xl border border-emerald-500/30 shadow-lg flex items-center justify-between cursor-pointer hover:border-emerald-500/60 transition-colors">
          <div className="flex items-center">
            <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-xl mr-4"><BarChart3 size={28} /></div>
            <div>
              <p className="text-sm text-emerald-400/80 font-medium">Doanh Thu Ước Tính (Tháng Này)</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{dashboardStats.currentRevenue.toLocaleString()} <span className="text-lg text-emerald-500 font-normal">VNĐ</span></h3>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center text-sm font-bold px-3 py-1 rounded-full border ${dashboardStats.growth >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
              {dashboardStats.growth >= 0 ? '+' : ''}{dashboardStats.growth}% so với tháng trước
            </span>
          </div>
        </div>
      </div>

      {/* Lớp học nổi bật */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center"><Star className="text-yellow-400 mr-2" size={20} /> Lớp Học Nổi Bật</h3>
          <button onClick={() => setActiveMenu('classes')} className="text-sm text-blue-400 hover:text-blue-300">Xem tất cả</button>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {classes.filter(c => c.isFeatured).map(c => (
            <div 
              key={c.id} 
              onClick={() => { setSelectedClass(c); setActiveMenu('classes'); }}
              className="bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden shadow-lg hover:border-slate-500 transition-colors cursor-pointer group"
            >
              <div 
                className={`h-24 ${!c.imageIsUrl ? c.image : 'bg-cover bg-center'} relative`}
                style={c.imageIsUrl ? {backgroundImage: `url(${import.meta.env.VITE_API_URL || ''}${c.image})`} : {}}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all"></div>
                <div className="absolute bottom-3 left-4">
                  <span className="text-xs bg-black/50 backdrop-blur-sm text-slate-900 dark:text-white px-2 py-1 rounded-md font-medium border border-white/10">{c.id}</span>
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{c.name}</h4>
                <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center"><Users size={16} className="mr-1" /> {c.students} HS</span>
                  <span className="font-bold text-emerald-400">{c.price.toLocaleString()}đ</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderClassList = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quản Lý Lớp Học</h2>
        <div className="flex gap-4">
          <div className="relative">
            <input type="text" placeholder="Tìm kiếm lớp học..." value={searchClass} onChange={e => setSearchClass(e.target.value)} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 w-64" />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
          </div>
          <button onClick={() => setShowCreateClass(true)} className="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold transition flex items-center shadow-lg shadow-blue-500/20">
            <Plus size={16} className="mr-2" /> Thêm Lớp Mới
          </button>
        </div>
      </div>

      {showCreateClass && (
        <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tạo Lớp Mới</h3>
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Tên lớp (VD: Toán 12)" value={newClassData.name} onChange={e => setNewClassData({...newClassData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <input type="number" placeholder="Số học sinh tối đa (Tối đa 50)" value={newClassData.max_students} onChange={e => {
                let val = Number(e.target.value);
                if (val > 50) val = 50;
                setNewClassData({...newClassData, max_students: val})
              }} min={1} max={50} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <input type="number" placeholder="Học phí" value={newClassData.price || ''} onChange={e => setNewClassData({...newClassData, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Ảnh đại diện lớp học</label>
                <input type="file" accept="image/*" onChange={(e) => onSelectFile(e, 'create')} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 dark:bg-slate-700 file:text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateClass} className="flex-1 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Tạo</button>
              <button onClick={() => setShowCreateClass(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {showEditClass && editClassData && (
        <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Sửa Lớp Học</h3>
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Tên lớp" value={editClassData.name} onChange={e => setEditClassData({...editClassData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <input type="text" placeholder="Mã lớp" value={editClassData.code} readOnly className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-500 cursor-not-allowed" />
              <input type="number" placeholder="Số học sinh tối đa" value={editClassData.max_students || 50} onChange={e => {
                let val = Number(e.target.value);
                if (val > 50) val = 50;
                setEditClassData({...editClassData, max_students: val})
              }} min={1} max={50} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <input type="number" placeholder="Học phí" value={editClassData.price || ''} onChange={e => setEditClassData({...editClassData, price: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white" />
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Cập nhật ảnh đại diện</label>
                <input type="file" accept="image/*" onChange={(e) => onSelectFile(e, 'edit')} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 dark:bg-slate-700 file:text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleEditClassSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Lưu</button>
              <button onClick={() => {setShowEditClass(false); setEditClassData(null);}} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-lg font-bold">Hủy</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 pb-2">
        {classes.filter(c => 
          c && 
          ((c.name || '').toLowerCase().includes(searchClass.toLowerCase()) || 
           (c.code && c.code.toLowerCase().includes(searchClass.toLowerCase())))
        ).map(c => (
          <div key={c.id} className="bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden flex flex-col hover:border-slate-300 dark:border-slate-600 transition">
            <div className={`h-32 ${!c.imageIsUrl ? c.image : 'bg-cover bg-center'} flex items-center justify-center`} style={c.imageIsUrl ? {backgroundImage: `url(${import.meta.env.VITE_API_URL || ''}${c.image})`} : {}}>
              {!c.imageIsUrl && <BookOpen size={40} className="text-slate-900/40 dark:text-white/40" />}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{c.id}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>{c.status}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 line-clamp-2">{c.name}</h3>
              <p className="text-emerald-400 font-bold mb-4">{c.price.toLocaleString()} VNĐ</p>
              
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-sm mb-6 mt-auto">
                <span className="flex items-center"><Users size={16} className="mr-1" /> {c.students} HS</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setSelectedClass(c)}
                  className="col-span-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center border border-blue-500/20 mb-2"
                >
                  <Eye size={16} className="mr-2" /> Chi Tiết
                </button>
                <button 
                  onClick={() => { setEditClassData(c); setShowEditClass(true); }}
                  className="col-span-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center">
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteClass(c.id)}
                  className="col-span-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-center border border-red-500/20">
                  <Trash2 size={14} className="mr-1" /> Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClassDetail = () => (
    <div className="animate-fade-in flex flex-col flex-1 min-h-0 -m-8 p-8 w-full">
      {/* Detail Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedClass(null)} 
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white rounded-lg transition border border-slate-200 dark:border-slate-700"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
              {selectedClass.name} <span className="ml-3 text-sm font-normal text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded">{selectedClass.id}</span>
            </h2>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 flex text-sm font-medium">
          <button onClick={() => setClassDetailTab('chat')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'chat' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><MessageSquare size={16} className="mr-2"/> Chat</button>
          <button onClick={() => setClassDetailTab('students')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'students' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><Users size={16} className="mr-2"/> Học sinh</button>
          <button onClick={() => setClassDetailTab('course_outline')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'course_outline' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><Folder size={16} className="mr-2"/> Lộ trình học</button>
          <button onClick={() => setClassDetailTab('gradebook')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'gradebook' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><FileSpreadsheet size={16} className="mr-2"/> Bảng điểm</button>
          <button onClick={() => setClassDetailTab('ai')} className={`px-4 py-2 rounded-md flex items-center transition ${classDetailTab === 'ai' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}><Sparkles size={16} className="mr-2 text-indigo-400"/> AI Hỗ trợ</button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 relative mt-4">
        {classDetailTab === 'chat' && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex flex-col overflow-hidden">
            <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700/50">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center"><MessageSquare size={18} className="mr-2 text-blue-400"/> Kênh thảo luận chung</h3>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
              {chatLoading && <div className="text-center text-slate-500 text-sm">Đang tải tin nhắn...</div>}
              {!chatLoading && chatMessages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex flex-col ${msg.is_teacher ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 px-1">{msg.sender} • {msg.time}</span>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${msg.is_teacher ? 'bg-blue-600 text-slate-900 dark:text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-700/50 flex gap-3">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Nhập tin nhắn..." 
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500" 
              />
              <button 
                onClick={handleSendChatMessage}
                className="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white px-5 rounded-xl transition flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {classDetailTab === 'students' && (
          <div className="absolute inset-0 p-6 overflow-y-auto custom-scrollbar bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex flex-col">
            <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
              <div className="flex gap-3">
                <button onClick={() => setShowAddStudent(true)} className="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center shadow-lg shadow-blue-500/20"><Plus size={14} className="mr-1"/> Thêm thủ công</button>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportExcel} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center"><Upload size={14} className="mr-1"/> Import CSV</button>
                <button onClick={() => {
                  const blob = new Blob(["Email\nstudent@example.com"], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url; link.setAttribute('download', 'Template_Import.csv');
                  document.body.appendChild(link); link.click(); document.body.removeChild(link);
                }} className="text-blue-400 hover:underline text-sm ml-2 flex items-center"><FileSpreadsheet size={14} className="mr-1"/> Tải file mẫu CSV</button>
              </div>
              <button onClick={handleExportExcel} className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-slate-600 transition flex items-center"><FileSpreadsheet size={14} className="mr-1"/> Export CSV</button>
            </div>
            
            {showAddStudent && (
              <div className="p-4 bg-slate-100 dark:bg-slate-700 border-b border-slate-300 dark:border-slate-600 flex gap-2">
                <input 
                  type="email" 
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="Nhập email học sinh..." 
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                />
                <button onClick={handleAddStudent} className="bg-blue-600 text-slate-900 dark:text-white px-4 rounded-lg text-sm font-bold">Thêm</button>
                <button onClick={() => setShowAddStudent(false)} className="bg-slate-600 text-slate-900 dark:text-white px-4 rounded-lg text-sm font-bold">Hủy</button>
              </div>
            )}

            <div className="p-4 bg-white/50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-700/50">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Star size={14} className="text-amber-500" fill="currentColor"/> Bảng Xếp Hạng Lớp (Top 3)</h4>
              <div className="flex justify-center items-end gap-4 h-56 bg-gradient-to-t from-slate-100 to-transparent dark:from-slate-800 rounded-xl border-b-4 border-amber-400 p-4 relative pt-12">
                {(() => {
                  const sortedMembers = [...classStudents]
                    .map(m => ({ ...m, score: m.total_score || 0 }))
                    .filter(m => m.score > 0)
                    .sort((a, b) => b.score - a.score);
                  
                  const top3 = sortedMembers.slice(0, 3);
                  if (top3.length === 0) return <div className="text-slate-500 font-medium self-center mb-8">Chưa có học sinh nào có điểm</div>;

                  return (
                    <>
                      {/* Top 2 */}
                      {top3[1] && (
                        <div className="flex flex-col items-center justify-end h-[70%] w-1/3 max-w-[120px]">
                          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xl font-bold mb-2 border-2 border-slate-300">
                            {(top3[1].full_name || top3[1].email)?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="text-sm font-bold truncate w-full text-center text-slate-700 dark:text-slate-300 px-2" title={top3[1].full_name || top3[1].email}>{top3[1].full_name || top3[1].email}</div>
                          <div className="text-xs text-slate-500 mt-1">{top3[1].score} điểm</div>
                          <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-t-lg mt-2 flex-1 flex items-start justify-center pt-2 font-bold text-slate-600 dark:text-slate-300 text-lg">2</div>
                        </div>
                      )}
                      {/* Top 1 */}
                      {top3[0] && (
                        <div className="flex flex-col items-center justify-end h-full w-1/3 max-w-[150px] z-10 relative">
                          <div className="absolute -top-10 animate-bounce"><Star fill="#f59e0b" className="text-amber-500 drop-shadow-md" size={32}/></div>
                          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl font-bold mb-2 border-4 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                            {(top3[0].full_name || top3[0].email)?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="text-sm font-bold truncate w-full text-center text-amber-600 dark:text-amber-400 px-2" title={top3[0].full_name || top3[0].email}>{top3[0].full_name || top3[0].email}</div>
                          <div className="text-xs text-amber-500/80 mt-1 font-bold">{top3[0].score} điểm</div>
                          <div className="w-full bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-lg mt-2 flex-1 flex items-start justify-center pt-2 font-bold text-white text-2xl shadow-lg">1</div>
                        </div>
                      )}
                      {/* Top 3 */}
                      {top3[2] && (
                        <div className="flex flex-col items-center justify-end h-[55%] w-1/3 max-w-[120px]">
                          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 text-lg font-bold mb-2 border-2 border-orange-300">
                            {(top3[2].full_name || top3[2].email)?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="text-sm font-bold truncate w-full text-center text-orange-700 dark:text-orange-400 px-2" title={top3[2].full_name || top3[2].email}>{top3[2].full_name || top3[2].email}</div>
                          <div className="text-xs text-slate-500 mt-1">{top3[2].score} điểm</div>
                          <div className="w-full bg-orange-300 dark:bg-orange-700 rounded-t-lg mt-2 flex-1 flex items-start justify-center pt-2 font-bold text-orange-800 dark:text-orange-200 text-lg">3</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm border-b border-slate-200/50 dark:border-slate-700/50">
                    <th className="p-4 font-medium">Họ tên</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Trạng thái Chat</th>
                    <th className="p-4 font-medium text-right">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {classStudents.map(s => (
                    <tr key={s.email} className="hover:bg-slate-100/20 dark:bg-slate-700/20 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{s.full_name}</td>
                      <td className="p-4 text-slate-700 dark:text-slate-300">{s.email}</td>
                      <td className="p-4">
                        {s.is_muted === 0 
                          ? <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Bình thường</span>
                          : <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded border border-orange-500/20">Bị Mute</span>}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button onClick={() => handleViewProfile(s.email)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded" title="Xem hồ sơ"><Eye size={16} /></button>
                        <button onClick={() => handleToggleMute(s.email, s.is_muted)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-orange-400 rounded" title={s.is_muted ? "Mở Chat" : "Chặn Chat"}>
                          {s.is_muted ? <MessageSquare size={16} /> : <VolumeX size={16} />}
                        </button>
                        <button onClick={() => handleRemoveStudent(s.email)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-red-400 rounded" title="Kick khỏi lớp"><ShieldBan size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {classStudents.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Chưa có học sinh nào trong lớp.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {studentProfile && (
              <div className="absolute inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-sm w-full">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Hồ sơ Học sinh</h3>
                  <div className="space-y-3 mb-6 text-sm">
                    <p className="text-slate-600 dark:text-slate-400">Họ tên: <span className="text-slate-900 dark:text-white font-medium">{studentProfile.full_name}</span></p>
                    <p className="text-slate-600 dark:text-slate-400">Email: <span className="text-slate-900 dark:text-white font-medium">{studentProfile.email}</span></p>
                    <p className="text-slate-600 dark:text-slate-400">Giới tính: <span className="text-slate-900 dark:text-white font-medium">{studentProfile.gender}</span></p>
                    <p className="text-slate-600 dark:text-slate-400">SĐT: <span className="text-slate-900 dark:text-white font-medium">{studentProfile.phone || 'Chưa cập nhật'}</span></p>
                  </div>
                  <button onClick={() => setStudentProfile(null)} className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-bold">Đóng</button>
                </div>
              </div>
            )}
          </div>
        )}

        {classDetailTab === 'course_outline' && (
          <div className="h-full relative">
            <CourseOutlineManager classId={selectedClass.id} />
          </div>
        )}

        {classDetailTab === 'ai' && (
          <div className="h-full bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg flex flex-col relative overflow-hidden">
            {!isAIChatActive ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 p-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                <Sparkles size={64} className="text-indigo-400 mb-6" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">AI Hỗ Trợ Lớp {selectedClass.name}</h2>
                <p className="text-slate-600 dark:text-slate-400 max-w-lg mb-8">Trợ lý AI đã được huấn luyện riêng với tài liệu và bài giảng của lớp này. Sẵn sàng giúp bạn giải đáp thắc mắc của học sinh, soạn đề kiểm tra 15p nhanh chóng.</p>
                <button onClick={() => setIsAIChatActive(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-slate-900 dark:text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 flex items-center z-10">
                  <MessageSquare size={18} className="mr-2" /> Bắt đầu trò chuyện với AI
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 z-10">
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center bg-white/80 dark:bg-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-slate-900 dark:text-white shadow-lg">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white leading-tight">FlyingClass AI Assistant</h3>
                      <p className="text-xs text-indigo-400">Đang hỗ trợ lớp: {selectedClass.name}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAIChatActive(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white text-sm bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg transition">Đóng</button>
                </div>
                
                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {aiMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <Bot size={48} className="mb-4 opacity-50" />
                      <p>Hãy đặt câu hỏi đầu tiên để bắt đầu trò chuyện với AI.</p>
                    </div>
                  )}
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-slate-900 dark:text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-sm shadow-md border border-slate-300 dark:border-slate-600'}`}>
                        <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.text}</div>
                      </div>
                    </div>
                  ))}
                  {isAILoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-md border border-slate-300 dark:border-slate-600 flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  )}
                  <div ref={aiMessagesEndRef} />
                </div>
                
                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200/50 dark:border-slate-700/50">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendAIMessage(); }} className="flex gap-3">
                    <input 
                      type="text" 
                      value={aiInput} 
                      onChange={e => setAiInput(e.target.value)} 
                      placeholder="Nhập câu hỏi hoặc yêu cầu cho AI..." 
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition shadow-inner"
                      disabled={isAILoading}
                    />
                    <button 
                      type="submit" 
                      disabled={isAILoading || !aiInput.trim()} 
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white w-12 rounded-xl flex items-center justify-center transition shadow-lg shadow-indigo-500/20"
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {classDetailTab === 'gradebook' && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg p-6 overflow-hidden flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center">
                <FileSpreadsheet size={18} className="mr-2 text-emerald-400"/> Bảng điểm tổng hợp
              </h3>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm học sinh..."
                    value={gradebookSearch}
                    onChange={(e) => setGradebookSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition shadow-lg shadow-emerald-500/20"
                >
                  <FileSpreadsheet size={16} className="mr-2" /> Xuất file CSV
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar border border-slate-200 dark:border-slate-700 rounded-lg">
              {gradebookLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-500">Đang tải bảng điểm...</div>
              ) : !gradebookData || !gradebookData.students || gradebookData.students.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-500">Lớp học chưa có học sinh.</div>
              ) : (
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 border-collapse">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 uppercase text-xs sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 font-bold bg-slate-50 dark:bg-slate-900 sticky left-0 z-20">Học Sinh</th>
                      <th className="px-6 py-4 font-bold">Email</th>
                      {(gradebookData.exams || []).map((exam: any) => (
                        <th key={exam.name} className="px-6 py-4 font-bold text-center min-w-[120px]">{exam.title}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-white/40 dark:bg-slate-800/40">
                    {(gradebookData.students || [])
                      .filter((s: any) => 
                        s.full_name?.toLowerCase().includes(gradebookSearch.toLowerCase()) || 
                        s.email?.toLowerCase().includes(gradebookSearch.toLowerCase())
                      )
                      .map((s: any) => {
                        const studentGrades = (gradebookData.grades || {})[s.email] || {};
                        return (
                          <tr key={s.email} className="hover:bg-slate-100/30 dark:bg-slate-700/30 transition">
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10">{s.full_name}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{s.email}</td>
                            {(gradebookData.exams || []).map((exam: any) => {
                              const score = studentGrades[exam.name];
                              return (
                                <td key={exam.name} className="px-6 py-4 text-center font-bold">
                                  {score !== undefined ? (
                                    <span className={score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'}>
                                      {score}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderGlobalStudents = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quản Lý Học Sinh (Toàn Cục)</h2>
        <div className="flex gap-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm kiếm tên, email..." 
              value={globalStudentSearch}
              onChange={(e) => setGlobalStudentSearch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 w-64" 
            />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-500" />
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg overflow-hidden flex flex-col">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-sm border-b border-slate-200/50 dark:border-slate-700/50">
              <th className="p-4 font-medium">Họ tên</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Tham gia từ</th>
              <th className="p-4 font-medium">Lớp đang học</th>
              <th className="p-4 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {globalStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 italic">Không tìm thấy học sinh nào.</td>
              </tr>
            ) : (
              globalStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-100/20 dark:bg-slate-700/20 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                  <td className="p-4 text-slate-700 dark:text-slate-300">{s.email}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 text-sm">{s.joinedAt}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {s.classes.map((cName: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-mono">
                          {cName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedStudentProfile(s)} className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-600 rounded transition" title="Xem hồ sơ">
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleGlobalMuteStudent(s.email, s.is_muted)} 
                        className={`p-1.5 rounded transition ${s.is_muted === 1 ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-600'}`} 
                        title={s.is_muted === 1 ? "Bỏ chặn chat" : "Chặn chat"}
                      >
                        <VolumeX size={16} />
                      </button>
                      <button 
                        onClick={() => handleGlobalKickStudent(s.email, s.name)} 
                        className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded transition" 
                        title="Xóa khỏi TẤT CẢ các lớp"
                      >
                        <ShieldBan size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRevenue = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Doanh Thu & Thống Kê</h2>
        <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
          <select 
            value={statFilterType} 
            onChange={e => {
              setStatFilterType(e.target.value);
              setStatFilterValue('');
            }}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded text-slate-900 dark:text-white px-3 py-1.5 outline-none focus:border-blue-500"
          >
            <option value="year">Lọc Theo Năm</option>
            <option value="quarter">Lọc Theo Quý</option>
            <option value="month">Lọc Theo Tháng</option>
          </select>

          <select 
            value={statFilterYear} 
            onChange={e => setStatFilterYear(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded text-slate-900 dark:text-white px-3 py-1.5 outline-none focus:border-blue-500"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {statFilterType === 'quarter' && (
            <select 
              value={statFilterValue} 
              onChange={e => setStatFilterValue(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded text-slate-900 dark:text-white px-3 py-1.5 outline-none focus:border-blue-500"
            >
              <option value="">Chọn Quý</option>
              {[1,2,3,4].map(q => <option key={q} value={q}>Quý {q}</option>)}
            </select>
          )}

          {statFilterType === 'month' && (
            <select 
              value={statFilterValue} 
              onChange={e => setStatFilterValue(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm rounded text-slate-900 dark:text-white px-3 py-1.5 outline-none focus:border-blue-500"
            >
              <option value="">Chọn Tháng</option>
              {Array.from({length: 12}).map((_, i) => (
                <option key={i+1} value={String(i+1)}>Tháng {i+1}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
            Tăng Trưởng Doanh Thu ({statFilterType === 'year' ? statFilterYear : (statFilterType === 'quarter' ? `Quý ${statFilterValue || '?'}/${statFilterYear}` : `Tháng ${statFilterValue || '?'}/${statFilterYear}`)})
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time_label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" name="Doanh thu (VNĐ)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Cơ Cấu Doanh Thu</h3>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={classRevenueDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {classRevenueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {classRevenueDistribution.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="flex items-center text-slate-700 dark:text-slate-300">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{entry.value.toLocaleString()} đ</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-slate-800/60 p-6 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Tăng Trưởng Số Lượng Học Sinh</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time_label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Tổng Học sinh" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderAIManagement = () => (
    <div className="max-w-5xl mx-auto animate-fade-in w-full pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-emerald-500" size={32} /> Quản lý AI & Tokens
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Quản lý gói dịch vụ AI, theo dõi token khả dụng và nâng cấp tài khoản.</p>
        </div>
        <button onClick={() => setShowAIPricing(true)} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2">
          <Sparkles size={18} /> Đăng ký / Mua Token
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl relative z-10">
              <Bot size={24} />
            </div>
            {aiSubscriptionStatus?.active ? (
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20 relative z-10">Đang hoạt động</span>
            ) : (
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-full text-xs font-bold relative z-10">Chưa đăng ký</span>
            )}
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1 relative z-10">Gói hiện tại</h3>
          <p className="text-2xl font-black text-slate-900 dark:text-white relative z-10">{aiSubscriptionStatus?.package_type || 'AI Cơ Bản (Miễn phí)'}</p>
          {aiSubscriptionStatus?.expire_date && (
            <p className="text-sm text-slate-500 mt-3 flex items-center gap-2 relative z-10"><Clock size={14} /> Hạn dùng: {aiSubscriptionStatus.expire_date}</p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl relative z-10">
              <Sparkles size={24} />
            </div>
            <button onClick={() => setShowAIPricing(true)} className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 text-sm font-bold relative z-10 flex items-center gap-1">Nạp thêm <Plus size={14}/></button>
          </div>
          {(() => {
            const is_subscribed = aiSubscriptionStatus?.is_active || aiSubscriptionStatus?.package_type;
            const tokens_left = is_subscribed ? (aiSubscriptionStatus?.tokens_left ?? 0) : (aiSubscriptionStatus?.trial_remaining ?? 0);
            const total_tokens = is_subscribed ? (aiSubscriptionStatus?.total_tokens ?? 0) : (aiSubscriptionStatus?.trial_limit ?? 10);
            const used_tokens = is_subscribed ? Math.max(0, total_tokens - tokens_left) : (aiSubscriptionStatus?.trial_used ?? 0);
            const percentUsed = total_tokens > 0 ? Math.min(100, Math.max(0, (used_tokens / total_tokens) * 100)) : 0;

            return (
              <>
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-1 relative z-10">Sử dụng Token</h3>
                <p className="text-3xl font-black text-slate-900 dark:text-white relative z-10">
                  {used_tokens.toLocaleString('vi-VN')} <span className="text-base text-slate-400 font-medium">/ {total_tokens.toLocaleString('vi-VN')}</span>
                </p>
                <div className="flex justify-between text-xs text-slate-500 mt-3 font-medium relative z-10">
                  <span>Đã dùng: {percentUsed.toFixed(1)}%</span>
                  <span>Còn lại: {tokens_left.toLocaleString('vi-VN')}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-1 overflow-hidden relative z-10">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percentUsed}%` }}></div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">Lịch sử sử dụng Token</h3>
        </div>
        <div className="p-6 h-[300px] w-full">
          {tokenHistory && tokenHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                <Bar dataKey="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Chưa có dữ liệu sử dụng gần đây.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAIAssistant = () => (
    <div className="h-full flex animate-fade-in w-full overflow-hidden">
      {/* Chat History Sidebar */}
      {showChatSidebar && (
        <div className="w-64 shrink-0 border-r border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 flex flex-col">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2"><History size={16} className="text-indigo-400" /> Lịch sử chat</h3>
            <button onClick={() => setShowChatSidebar(false)} className="text-slate-400 hover:text-slate-900 dark:text-white p-1"><ChevronLeft size={16}/></button>
          </div>
          <div className="p-3">
            <button onClick={handleNewChatSession} className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
              <Plus size={14}/> Phiên chat mới
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 px-3 pb-4">
            {chatSessions.length === 0 && <p className="text-slate-500 text-xs text-center mt-4">Chưa có lịch sử chat</p>}
            {chatSessions.map((s: any) => (
              <button key={s.name} onClick={() => handleLoadSession(s.name)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition truncate ${
                  currentSessionName === s.name ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {!showChatSidebar && (
              <button onClick={() => setShowChatSidebar(true)} className="text-slate-400 hover:text-slate-900 dark:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                <History size={18}/>
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <Bot size={22} className="mr-2 text-indigo-400" /> Tạo Đề Thi (AI)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Trợ lý tải tài liệu và tự động sinh đề thi trắc nghiệm.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAIPricing(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition border border-blue-500 shadow-md">
              Đăng ký AI
            </button>
            <button onClick={() => handleSendAiMessage("Hãy lên ý tưởng cho một vài đề thi trắc nghiệm sắp tới.")} className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-900 dark:text-white transition border border-slate-500 shadow-md">Lên ý tưởng đề thi</button>
            <button onClick={() => handleSendAiMessage("Hãy phân tích sơ bộ tình hình điểm số của học sinh và đưa ra lời khuyên.")} className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-700/80 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-900 dark:text-white transition border border-slate-500 shadow-md">Phân tích điểm số</button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
          {aiChatLogs.map((log, i) => (
            <div key={i} className={`flex gap-4 max-w-4xl mx-auto ${log.sender === 'Bạn' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.sender === 'Bạn' ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                {log.sender === 'Bạn' ? <User size={20} className="text-white"/> : <Sparkles size={20} className="text-white"/>}
              </div>
              <div className={`flex flex-col ${log.sender === 'Bạn' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${log.sender === 'Bạn' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-lg'}`}>
                  <div className={`text-xs opacity-70 font-bold mb-2 ${log.sender === 'Bạn' ? 'text-blue-200 text-right' : 'text-indigo-400 text-left'}`}>{log.sender}</div>
                  <div className="overflow-x-auto prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                    >
                      {log.text}
                    </ReactMarkdown>
                  </div>
                  {log.questions && log.questions.length > 0 && (
                    <div className="mt-4 space-y-4 w-full min-w-[400px]">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <CheckCircle size={16}/> Tìm thấy {log.questions.length} câu hỏi
                      </div>
                      {log.questions.map((q: any, idx: number) => (
                        <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-left">
                          <div className="font-bold text-slate-900 dark:text-white mb-2 flex">
                            <span className="whitespace-nowrap mr-2">Câu {idx+1}.</span>
                            <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {q.question_text || ''}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <ul className="space-y-1 text-slate-700 dark:text-slate-300 ml-2">
                            <li className="flex items-start">
                              <span className="mr-2">A.</span> 
                              <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_a || ''}</ReactMarkdown>
                              </div>
                              {q.correct_answer === 'A' && <span className="text-emerald-400 ml-2 font-bold">✓</span>}
                            </li>
                            <li className="flex items-start">
                              <span className="mr-2">B.</span> 
                              <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_b || ''}</ReactMarkdown>
                              </div>
                              {q.correct_answer === 'B' && <span className="text-emerald-400 ml-2 font-bold">✓</span>}
                            </li>
                            <li className="flex items-start">
                              <span className="mr-2">C.</span> 
                              <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_c || ''}</ReactMarkdown>
                              </div>
                              {q.correct_answer === 'C' && <span className="text-emerald-400 ml-2 font-bold">✓</span>}
                            </li>
                            <li className="flex items-start">
                              <span className="mr-2">D.</span> 
                              <div className="inline-block prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.option_d || ''}</ReactMarkdown>
                              </div>
                              {q.correct_answer === 'D' && <span className="text-emerald-400 ml-2 font-bold">✓</span>}
                            </li>
                          </ul>
                        </div>
                      ))}
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => { if (log.questions) { setPendingAiQuestions(log.questions); initBuilderFromAI(log.questions); }}} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2">
                          <Archive size={16}/> Lưu vào Kho đề
                        </button>
                        <button onClick={() => log.questions && handleOpenScheduleModal(log.questions)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2">
                          <Clock size={16}/> Phân công ngay
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isAiTyping && (
            <div className="flex gap-4 max-w-4xl mx-auto">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600">
                <Sparkles size={20} className="text-white"/>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-tl-none flex gap-1 items-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="max-w-4xl mx-auto relative">
            {aiChatLogs.length <= 1 && (
              <div className="flex gap-2 flex-wrap mb-3">
                <button onClick={() => handleSendAiMessage("Tạo 10 câu trắc nghiệm môn Vật Lý")} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-4 py-1.5 rounded-full text-xs font-medium transition">Tạo 10 câu trắc nghiệm môn Vật Lý</button>
                <button onClick={() => handleSendAiMessage("Dựa vào tài liệu đính kèm, tạo 5 câu trắc nghiệm")} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-4 py-1.5 rounded-full text-xs font-medium transition">Tạo từ tài liệu đính kèm</button>
                <button onClick={() => handleSendAiMessage("Gợi ý cho tôi các chủ đề ôn tập môn Lịch Sử")} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white px-4 py-1.5 rounded-full text-xs font-medium transition">Gợi ý chủ đề ôn tập</button>
              </div>
            )}
            {aiAttachedFile && (
              <div className="absolute -top-10 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs flex items-center shadow-lg">
                <Upload size={14} className="mr-2 text-indigo-400"/> {aiAttachedFile.name}
                <button onClick={() => setAiAttachedFile(null)} className="ml-2 hover:text-red-400 transition"><Trash2 size={14}/></button>
              </div>
            )}
            <textarea value={aiChatInput} onChange={(e) => setAiChatInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendAiMessage(); } }}
              placeholder="Tải lên tài liệu (.pdf, .docx, .txt) và nhập số câu hỏi (VD: Tạo 10 câu trắc nghiệm)..." 
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-14 py-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none shadow-lg custom-scrollbar" rows={2}>
            </textarea>
            <label className="absolute left-3 bottom-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-xl transition cursor-pointer">
              <Upload size={18} />
              <input type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => { if(e.target.files && e.target.files[0]) setAiAttachedFile(e.target.files[0]); }} />
            </label>
            <button onClick={() => handleSendAiMessage()} disabled={(!aiChatInput.trim() && !aiAttachedFile) || isAiTyping}
              className="absolute right-3 bottom-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 text-white p-2 rounded-xl transition">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExamBank = () => (
    <div className="animate-fade-in">
      {examBankView === 'list' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3"><Archive size={24} className="text-violet-400"/> Kho Đề Thi</h2>
              <p className="text-sm text-slate-500 mt-1">Lưu trữ và quản lý toàn bộ đề thi của bạn.</p>
            </div>
            <button onClick={() => { setBuilderTitle(''); setBuilderDuration(45); setBuilderNumQ(5); setBuilderStep('setup'); setBuilderQuestions([]); setExamBankView('builder'); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition shadow-lg">
              <PenSquare size={16}/> Tạo đề thủ công
            </button>
          </div>

          {examBankList.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Archive size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600"/>
              <p className="font-medium">Kho đề trống</p>
              <p className="text-sm mt-1">Tạo đề thủ công hoặc lưu từ kết quả AI để thêm đề vào kho.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {examBankList.map((exam: any) => {
                return (
                  <div key={exam.name} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
                    {/* Card Header */}
                    <div className="p-5 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate">{exam.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{exam.duration} phút • {exam.questions?.length ?? 0} câu</p>
                      </div>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <button onClick={() => handleOpenEditExamBank(exam)}
                          className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-bold rounded-lg transition flex items-center gap-1.5 border border-blue-500/20">
                          <Edit size={14}/> Sửa
                        </button>
                        <button onClick={() => { setCurrentExamQuestions(exam.questions || []); setScheduleData(prev => ({ ...prev, examName: exam.title })); setShowScheduleModal(true); }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition flex items-center gap-1.5">
                          <Clock size={14}/> Phân công
                        </button>
                        <button onClick={() => handleDeleteExamFromBank(exam.name, exam.title)}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-lg transition flex items-center gap-1.5 border border-red-500/20">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {examBankView === 'builder' && (
        <div className="max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setExamBankView('list'); setBuilderStep('setup'); setEditingBankExam(null); }} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-400">
              <ChevronLeft size={20}/>
            </button>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingBankExam ? `Sửa đề: ${editingBankExam.title}` : (builderStep === 'setup' ? 'Thiết lập đề thi' : `Soạn câu hỏi (${builderQuestions.length} câu)`)}
            </h2>
            {editingBankExam && <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-full">Chế độ sửa</span>}
          </div>

          {builderStep === 'setup' && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tên đề thi <span className="text-red-400">*</span></label>
                <input value={builderTitle} onChange={e => setBuilderTitle(e.target.value)} placeholder="Ví dụ: Đề kiểm tra 15 phút - Toán 10" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Thời gian làm bài (phút)</label>
                  <input type="number" min={5} value={builderDuration} onChange={e => setBuilderDuration(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Số lượng câu hỏi</label>
                  <input type="number" min={1} max={100} value={builderNumQ} onChange={e => setBuilderNumQ(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"/>
                </div>
              </div>
              <button onClick={handleInitManualBuilder} disabled={!builderTitle.trim()}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition">
                Tiếp theo: Soạn câu hỏi →
              </button>
            </div>
          )}

          {builderStep === 'questions' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Tên đề thi <span className="text-red-400">*</span></label>
                  <input value={builderTitle} onChange={e => setBuilderTitle(e.target.value)} placeholder="Nhập tên đề thi..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"/>
                </div>
                <div className="w-32 shrink-0">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Thời gian (phút)</label>
                  <input type="number" min={5} value={builderDuration} onChange={e => setBuilderDuration(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none text-center"/>
                </div>
              </div>
              
              <div className="flex justify-end mb-2">
                <button onClick={() => { const nq = [...builderQuestions, { question_text: '', options: ['', '', '', ''], correctIndex: 0 }]; setBuilderQuestions(nq); }}
                  className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-600 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 dark:text-violet-400 text-sm font-bold rounded-lg transition flex items-center gap-2">
                  <Plus size={16}/> Thêm câu hỏi
                </button>
              </div>
              {builderQuestions.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  Chưa có câu hỏi nào trong đề thi. Vui lòng thêm câu hỏi.
                </div>
              )}
              {builderQuestions.map((q, qi) => (
                <div key={qi} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-bold text-sm flex items-center justify-center">{qi+1}</span>
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea value={q.question_text} onChange={e => { const nq = [...builderQuestions]; nq[qi].question_text = e.target.value; setBuilderQuestions(nq); }}
                        placeholder={`Nội dung câu hỏi ${qi+1}... (Hỗ trợ Markdown)`} rows={3}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none resize-none"/>
                      
                      <div className="flex justify-start">
                        <label className="cursor-pointer text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1.5 transition">
                          <ImageIcon size={14} />
                          Đính kèm ảnh
                          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                            if(e.target.files && e.target.files[0]) {
                              try {
                                const url = await classService.uploadFile(e.target.files[0]);
                                const nq = [...builderQuestions];
                                const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || ''}${url}`;
                                nq[qi].question_text = nq[qi].question_text + `\n\n![Hình ảnh](${fullUrl})`;
                                setBuilderQuestions(nq);
                              } catch(err) {
                                alert("Lỗi tải ảnh lên!");
                              }
                            }
                            e.target.value = '';
                          }} />
                        </label>
                      </div>

                      {q.question_text && (
                        <div className="mt-1 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <div className="text-xs text-slate-500 mb-2 font-bold uppercase">Xem trước</div>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {q.question_text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { const nq = [...builderQuestions]; nq.splice(qi, 1); setBuilderQuestions(nq); }}
                      className="shrink-0 text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition mt-0.5" title="Xóa câu hỏi">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                  <div className="ml-10 space-y-2">
                    {q.options.map((opt: string, oi: number) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button onClick={() => { const nq = [...builderQuestions]; nq[qi].correctIndex = oi; setBuilderQuestions(nq); }}
                          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                            q.correctIndex === oi ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                          }`}>
                          {q.correctIndex === oi && <CheckCircle size={14}/>}
                        </button>
                        <span className="text-xs font-bold text-slate-500 w-5">{String.fromCharCode(65+oi)}.</span>
                        <input value={opt} onChange={e => { const nq = [...builderQuestions]; nq[qi].options[oi] = e.target.value; setBuilderQuestions(nq); }}
                          placeholder={`Đáp án ${String.fromCharCode(65+oi)}`}
                          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none"/>
                        {q.options.length > 2 && (
                          <button onClick={() => { const nq = [...builderQuestions]; nq[qi].options.splice(oi, 1); if(nq[qi].correctIndex >= nq[qi].options.length) nq[qi].correctIndex = 0; setBuilderQuestions(nq); }}
                            className="shrink-0 text-slate-400 hover:text-red-400 p-1 transition"><XCircle size={15}/></button>
                        )}
                      </div>
                    ))}
                    {q.options.length < 8 && (
                      <button onClick={() => { const nq = [...builderQuestions]; nq[qi].options.push(''); setBuilderQuestions(nq); }}
                        className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1 transition">
                        <Plus size={12}/> Thêm đáp án
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <button onClick={() => editingBankExam ? handleUpdateExamInBank(false) : handleSaveExamToBank(false)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
                  <Archive size={18}/> {editingBankExam ? 'Cập nhật đề thi' : 'Lưu vào Kho đề'}
                </button>
                <button onClick={() => editingBankExam ? handleUpdateExamInBank(true) : handleSaveExamToBank(true)}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">
                  <Clock size={18}/> Lưu & Phân công ngay
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-5xl mx-auto animate-fade-in w-full pb-10">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Hồ Sơ & Cài Đặt Cá Nhân</h2>
      
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl overflow-hidden">
        {/* Cover Photo / Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
           <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="px-6 sm:px-10 pb-10">
          {/* Avatar & Header Info */}
          <div className="relative flex justify-between items-end -mt-12 mb-8">
            <div className="flex gap-6 items-end">
              <div className="relative z-10">
                <label className="cursor-pointer group block">
                  {avatarData ? (
                    <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-white">
                      <img src={avatarData} className="w-full h-full object-cover" alt="Avatar" />
                    </div>
                  ) : user?.user_image ? (
                    <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-white">
                      <img src={user.user_image.startsWith('http') ? user.user_image : `${import.meta.env.VITE_API_URL || ''}${user.user_image}`} className="w-full h-full object-cover" alt="Avatar" />
                    </div>
                  ) : (
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-2xl border-4 border-white dark:border-slate-800">
                      {user?.full_name?.charAt(0) || 'FC'}
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 p-2 bg-blue-600 border-2 border-white dark:border-slate-800 rounded-xl text-white hover:bg-blue-700 transition shadow-lg group-hover:scale-110">
                    <ImageIcon size={16}/>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setAvatarData(ev.target.result as string);
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} />
                </label>
              </div>

              <div className="pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.full_name || 'Giáo viên'}</h3>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                    Đã xác thực
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{user?.email}</p>
              </div>
            </div>

            {/* Rating Badge on Top Right */}
            {teacherRating.count > 0 && (
              <div className="pb-2">
                <div className="flex flex-col items-center bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border border-amber-200 dark:border-amber-700/50 px-4 py-2 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-lg">
                    <Star size={18} fill="currentColor" /> {teacherRating.average}
                  </div>
                  <div className="text-xs text-amber-700/70 dark:text-amber-500/70 font-medium">
                    {teacherRating.count} đánh giá
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Form Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <User size={16} className="text-blue-500"/> Thông tin cơ bản
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Họ và tên</label>
                    <input type="text" value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Số điện thoại</label>
                    <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ngày tháng năm sinh</label>
                    <input type="date" value={profileForm.dob} onChange={e => setProfileForm({...profileForm, dob: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Số CCCD</label>
                    <input type="text" value={profileForm.cccd_number} onChange={e => setProfileForm({...profileForm, cccd_number: e.target.value})} placeholder="Nhập số CCCD" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email đăng nhập</label>
                  <input type="email" disabled defaultValue={user?.email || ''} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-500 cursor-not-allowed shadow-inner" />
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-emerald-500"/> Giấy tờ xác thực
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ảnh CCCD</label>
                    <label className="w-full h-36 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all overflow-hidden group">
                      {idCardFile || profileForm.id_card_image ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center group-hover:opacity-80 transition">
                          <span className="text-xs text-white font-medium z-10 bg-slate-900/70 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">{idCardFile ? idCardFile.name : 'Đã tải lên (Click để đổi)'}</span>
                          {profileForm.id_card_image && !idCardFile && <img src={profileForm.id_card_image.startsWith('http') ? profileForm.id_card_image : `${import.meta.env.VITE_API_URL || ''}${profileForm.id_card_image}`} className="absolute inset-0 w-full h-full object-cover" />}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500 font-medium flex flex-col items-center group-hover:text-blue-500 transition-colors">
                          <Upload size={28} className="mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                          Tải lên ảnh CCCD
                        </span>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={e => { if(e.target.files?.[0]) setIdCardFile(e.target.files[0]) }} />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ảnh Chứng chỉ</label>
                    <label className="w-full h-36 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all overflow-hidden group">
                      {certFile || profileForm.certificate_image ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center group-hover:opacity-80 transition">
                          <span className="text-xs text-white font-medium z-10 bg-slate-900/70 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">{certFile ? certFile.name : 'Đã tải lên (Click để đổi)'}</span>
                          {profileForm.certificate_image && !certFile && <img src={profileForm.certificate_image.startsWith('http') ? profileForm.certificate_image : `${import.meta.env.VITE_API_URL || ''}${profileForm.certificate_image}`} className="absolute inset-0 w-full h-full object-cover" />}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500 font-medium flex flex-col items-center group-hover:text-blue-500 transition-colors">
                          <Upload size={28} className="mb-2 text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                          Tải lên ảnh Chứng chỉ
                        </span>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={e => { if(e.target.files?.[0]) setCertFile(e.target.files[0]) }} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 space-y-5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Key size={16} className="text-red-500"/> Đổi mật khẩu
                </h4>
                <div className="space-y-4">
                  <div>
                    <input type="password" placeholder="Mật khẩu hiện tại" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="password" placeholder="Mật khẩu mới" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                    <input type="password" placeholder="Nhập lại mật khẩu mới" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleProfileUpdate} 
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  <CheckCircle size={18} />
                  Lưu thay đổi
                </button>
              </div>
            </div>

            {/* Right Column: Reviews & Statistics */}
            <div className="space-y-6">
              {/* Ratings List */}
              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 h-full max-h-[750px] flex flex-col">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <MessageSquare size={16} className="text-amber-500"/> Nhận xét từ học sinh
                </h4>
                
                {teacherRating.reviews && teacherRating.reviews.length > 0 ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                    {teacherRating.reviews.map((rev: any, idx: number) => (
                      <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm relative transition hover:-translate-y-1 hover:shadow-md">
                        <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md flex items-center shadow-sm font-bold text-[10px]">
                          <Star size={10} className="mr-1" fill="currentColor"/> {rev.stars}
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                            {rev.student?.charAt(0) || 'H'}
                          </div>
                          <div className="flex-1 min-w-0 pr-12">
                            <span className="text-sm font-bold text-slate-900 dark:text-white block truncate" title={rev.student}>{rev.student}</span>
                            <span className="text-[10px] text-slate-500">Học sinh</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed mt-3 break-words">"{rev.comment || 'Không có bình luận'}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 py-10">
                    <MessageSquare size={48} className="mb-4" />
                    <p className="text-sm font-medium">Chưa có đánh giá nào</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- MAIN STRUCTURE ---
  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

  const isApproved = profile?.status === 'Approved';

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col items-center py-12 overflow-y-auto">
        <div className="max-w-4xl w-full px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 mb-4">
              <ShieldBan size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Xác Thực Hồ Sơ Giáo Viên</h1>
            
            {profile?.status === 'Pending' ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl max-w-2xl mx-auto">
                <p className="font-medium">⏳ Hồ sơ của bạn đang được xem xét.</p>
                <p className="text-sm mt-1">Chúng tôi sẽ thông báo cho bạn khi quá trình duyệt hoàn tất. Bạn vẫn có thể cập nhật lại thông tin nếu cần.</p>
              </div>
            ) : profile?.status === 'Rejected' ? (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl max-w-2xl mx-auto">
                <p className="font-bold flex items-center justify-center"><AlertTriangle size={18} className="mr-2"/> Hồ sơ bị từ chối</p>
                <p className="text-sm mt-1">Lý do: {profile?.rejection_reason || 'Vui lòng cập nhật lại thông tin theo yêu cầu.'}</p>
              </div>
            ) : (
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                Để đảm bảo chất lượng giảng dạy, vui lòng hoàn thiện hồ sơ cá nhân và cung cấp các giấy tờ cần thiết. Bạn sẽ truy cập được Teacher Portal sau khi hồ sơ được duyệt.
              </p>
            )}
            
            <button onClick={logout} className="mt-6 text-sm font-medium text-slate-500 hover:text-red-500 transition border border-slate-300 dark:border-slate-700 hover:border-red-500 px-4 py-2 rounded-lg">
              Đăng xuất
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden relative">
            {profile?.status === 'Pending' && <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[1px] z-20 pointer-events-none"></div>}
            {renderProfile()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <nav className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-lg shadow-blue-500/20">FC</div>
              <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">FlyingClass</span>
              <span className="text-xs text-blue-400 font-medium bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20 ml-2">Teacher</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-slate-100/50 dark:bg-slate-700/50 transition text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="flex items-center gap-3">
                {user?.user_image ? (
                  <img src={user.user_image.startsWith('http') ? user.user_image : `${import.meta.env.VITE_API_URL || ''}${user.user_image}`} className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-600" alt="Avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {user?.full_name?.charAt(0) || 'FC'}
                  </div>
                )}
                <div className="text-right max-w-[150px] sm:max-w-[200px] flex flex-col items-end">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.full_name || 'Giáo Viên'}</p>
                  {aiSubscriptionStatus?.active && (
                    <span className="text-[10px] bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold mt-0.5 border border-indigo-500/20 flex items-center gap-1 w-fit">
                      <Sparkles size={10} /> {aiSubscriptionStatus.package_type}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={logout} className="text-xs bg-transparent border border-red-500 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/10 transition font-bold">Đăng xuất</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 w-full overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200/50 dark:border-slate-700/50 px-4 pt-4 pb-4 flex flex-col bg-slate-50/80 dark:bg-slate-900/80 shrink-0">

          {/* Main nav — flex-1 fills available space */}
          <div className="flex flex-col gap-2 flex-1">
            <button onClick={() => { setActiveMenu('dashboard'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'dashboard' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <LayoutDashboard size={20} /> Tổng quan
            </button>

            <button onClick={() => { setActiveMenu('classes'); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'classes' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <BookOpen size={20} /> Quản lý lớp học
            </button>

            <button onClick={() => { setActiveMenu('students'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'students' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <Users size={20} /> Quản lý học sinh
            </button>

            <button onClick={() => { setActiveMenu('exams'); setSelectedClass(null); setSelectedExamForResults(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'exams' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <ClipboardList size={20} /> Quản lý bài thi
            </button>

            <button onClick={() => { setActiveMenu('revenue'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'revenue' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <BarChart3 size={20} /> Doanh thu & KQ
            </button>

            <button onClick={() => { setActiveMenu('ai_assistant'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'ai_assistant' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <Bot size={20} /> AI Hỗ trợ
            </button>

            <button onClick={() => { setActiveMenu('ai_management'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'ai_management' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <Cpu size={20} /> Quản lý AI
            </button>

            <button onClick={() => { setActiveMenu('exam_bank'); setSelectedClass(null); setExamBankView('list'); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'exam_bank' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <Archive size={20} /> Kho Đề Thi
            </button>

            <button onClick={() => { setActiveMenu('profile'); setSelectedClass(null); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-sm ${activeMenu === 'profile' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg' : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}>
              <User size={20} /> Trang cá nhân
            </button>
          </div>
        </aside>


        {/* Main Content */}
        <main className={`flex-1 custom-scrollbar bg-slate-50 dark:bg-slate-900 relative flex flex-col ${activeMenu === 'ai_assistant' ? 'overflow-hidden p-0' : 'overflow-y-auto p-8'}`}>
          {activeMenu === 'dashboard' && renderDashboard()}
          {activeMenu === 'classes' && (selectedClass ? renderClassDetail() : renderClassList())}
          {activeMenu === 'students' && renderGlobalStudents()}
          {activeMenu === 'exams' && (selectedExamForResults ? renderExamResults() : renderExamManagement())}
          {activeMenu === 'revenue' && renderRevenue()}
          {activeMenu === 'ai_assistant' && renderAIAssistant()}
          {activeMenu === 'ai_management' && renderAIManagement()}
          {activeMenu === 'exam_bank' && renderExamBank()}
          {activeMenu === 'profile' && renderProfile()}
        </main>
      </div>

      {selectedStudentProfile && (
        <div className="fixed inset-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
              <button onClick={() => setSelectedStudentProfile(null)} className="absolute top-4 right-4 text-slate-900/70 dark:text-white/70 hover:text-slate-900 dark:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition">X</button>
            </div>
            <div className="px-6 pb-6 pt-0 relative">
              <div className="w-24 h-24 rounded-full border-4 border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-4xl text-slate-900 dark:text-white font-bold mx-auto -mt-12 shadow-lg z-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500"></div>
                <span className="relative z-10">{selectedStudentProfile.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="text-center mt-4 mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedStudentProfile.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 mt-1 flex items-center justify-center gap-1"><User size={14} /> {selectedStudentProfile.email}</p>
                <div className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium mt-3">
                  <Star size={12} className="fill-green-400" /> Học viên đang hoạt động
                </div>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center"><BookOpen size={16} className="mr-2 text-indigo-400"/> Các lớp đang theo học</h4>
                <div className="space-y-2">
                  {selectedStudentProfile.classes.map((cls: string, idx: number) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-slate-900 dark:text-white font-medium text-sm">{cls}</span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">Tham gia: {selectedStudentProfile.joinedAt}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center"><Plus size={16} className="mr-2 text-emerald-400"/> Thêm học viên vào lớp</h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nhập mã lớp..." 
                    id="classCodeInputProfile"
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={async () => {
                      const code = (document.getElementById('classCodeInputProfile') as HTMLInputElement).value;
                      if(!code.trim()) return;
                      const cls = classes.find(c => c.code === code.trim() || c.id === code.trim());
                      if(cls) {
                        try {
                          await classService.addStudent(cls.id, selectedStudentProfile.email);
                          alert("Thêm học viên thành công!");
                          fetchGlobalStudents();
                          setSelectedStudentProfile(null);
                        } catch(err: any) {
                          alert(err.response?.data?.message || err.message || 'Lỗi khi thêm học viên');
                        }
                      } else {
                        alert("Mã lớp không tồn tại hoặc bạn không quản lý lớp này.");
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow-lg shadow-emerald-500/20">
                    Thêm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl p-6 relative flex flex-col">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Cắt ảnh đại diện</h3>
            <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden mb-4">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                onZoomChange={setZoom}
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  if(!croppedAreaPixels) return;
                  const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels);
                  if (croppedFile) {
                    if (targetForm === 'create') {
                      setNewClassData({...newClassData, imageFile: croppedFile});
                    } else if (targetForm === 'edit' && editClassData) {
                      setEditClassData({...editClassData, imageFile: croppedFile, imageIsUrl: false, image: URL.createObjectURL(croppedFile)});
                    }
                  }
                  setCropImageSrc(null);
                  setTargetForm(null);
                }} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-slate-900 dark:text-white py-2 rounded-lg font-bold shadow-lg"
              >
                Cắt & Lưu Ảnh
              </button>
              <button onClick={() => { setCropImageSrc(null); setTargetForm(null); }} className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white py-2 rounded-lg font-bold shadow-lg">Hủy bỏ</button>
            </div>
          </div>
        </div>
      )}
      {/* Schedule Modal (Moved to root to prevent transform clipping) */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><Clock size={20} className="text-emerald-400"/> Phân Công Bài Thi</h3>
            <p className="text-sm text-slate-500 mb-5">Cấu hình thời gian và giao đề thi cho lớp học.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tên Đề Thi <span className="text-red-400">*</span></label>
                <input type="text" value={scheduleData.examName} onChange={e => setScheduleData({...scheduleData, examName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" placeholder="VD: Kiểm tra 15p - Vật lý 11" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lớp Học <span className="text-red-400">*</span></label>
                <select value={scheduleData.classLink} onChange={e => setScheduleData({...scheduleData, classLink: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500">
                  <option value="">-- Chọn lớp --</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.code ? `(${c.code})` : ''}</option>
                  ))}
                </select>
                {classes.length === 0 && <p className="text-xs text-amber-400 mt-1">⚠ Bạn chưa có lớp nào. Hãy tạo lớp trước.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bắt đầu <span className="text-slate-500 text-xs">(để trống = mở ngay)</span></label>
                  <input type="datetime-local" value={scheduleData.startTime} onChange={e => setScheduleData({...scheduleData, startTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kết thúc <span className="text-slate-500 text-xs">(để trống = đóng tay)</span></label>
                  <input type="datetime-local" value={scheduleData.endTime} onChange={e => setScheduleData({...scheduleData, endTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Thời gian làm bài (Phút)</label>
                  <input type="number" value={scheduleData.durationMinutes} onChange={e => setScheduleData({...scheduleData, durationMinutes: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Số lần thi cho phép</label>
                  <input type="number" value={scheduleData.maxAttempts} onChange={e => setScheduleData({...scheduleData, maxAttempts: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" min="1" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowScheduleModal(false); setScheduleData({ classLink: '', examName: '', startTime: '', endTime: '', durationMinutes: 45, maxAttempts: 1 }); }} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-white font-medium transition">Hủy</button>
              <button onClick={handleScheduleExam} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold transition shadow-lg shadow-emerald-500/20">✓ Xác Nhận & Giao Bài</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Exam Modal */}
      {editingExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 w-[500px]">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Sửa Đề Thi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Tên Đề Thi</label>
                <input type="text" value={editExamData.title} onChange={e => setEditExamData({...editExamData, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Bắt đầu</label>
                  <input type="datetime-local" value={editExamData.startTime} onChange={e => setEditExamData({...editExamData, startTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Kết thúc</label>
                  <input type="datetime-local" value={editExamData.endTime} onChange={e => setEditExamData({...editExamData, endTime: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Thời gian làm bài (Phút)</label>
                  <input type="number" value={editExamData.durationMinutes} onChange={e => setEditExamData({...editExamData, durationMinutes: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500" min="1" />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 dark:text-slate-300 mb-1">Số lần thi cho phép</label>
                  <input type="number" value={editExamData.maxAttempts} onChange={e => setEditExamData({...editExamData, maxAttempts: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:border-blue-500" min="1" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingExam(null)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-900 dark:text-white font-medium transition">Hủy</button>
              <button onClick={handleSaveEditExam} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-slate-900 dark:text-white font-medium transition">Lưu Thay Đổi</button>
            </div>
          </div>
        </div>
      )}

      <AIPricingModal isOpen={showAIPricing} onClose={() => setShowAIPricing(false)} />
    </div>
  );
};

export default TeacherDashboard;
