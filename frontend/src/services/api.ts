import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Chuyển sang false khi Frappe server chạy ổn định để gọi API thật
const USE_MOCK = false;

const MockData = {
  get_my_classes: {
    message: {
      classes: [
        {
          class_id: "CLS-2023-0001",
          class_name: "Toán Cao Cấp 101",
          teacher_name: "Nguyễn Văn A",
          class_code: "MATH101",
          status: "Active"
        },
        {
          class_id: "CLS-2023-0002",
          class_name: "Lập trình React JS",
          teacher_name: "Trần B",
          class_code: "REACT202",
          status: "Active"
        }
      ]
    }
  }
};

export const authService = {
  forgotPasswordSendOTP: async (email: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_auth.forgot_password_send_otp', { email });
    return res.data.message;
  },
  forgotPasswordVerifyOTP: async (email: string, otp: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_auth.forgot_password_verify_otp', { email, otp });
    return res.data.message;
  },
  forgotPasswordReset: async (email: string, otp: string, new_password: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_auth.forgot_password_reset', { email, otp, new_password });
    return res.data.message;
  },
  getGoogleAuthUrl: async () => {
    const res = await api.post('/api/method/flying_class.flying_class.api_auth.get_google_auth_url', { 
      redirect_to: window.location.origin 
    });
    return res.data.message;
  }
};

export const classService = {
  getMyClasses: async () => {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => resolve(MockData.get_my_classes.message), 500));
    }
    const res = await api.get('/api/method/flying_class.flying_class.api.get_my_classes');
    return res.data.message;
  },
  
  joinClass: async (class_code: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.join_class', { class_code });
    return res.data.message;
  },

  leaveClass: async (class_id: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.leave_class', { class_id });
    return res.data;
  },

  createClass: async (class_name: string, class_code: string, price: number = 0, max_students: number = 50, image: string = '') => {
    const res = await api.post('/api/method/flying_class.flying_class.api.create_class', { class_name, class_code, price, max_students, image });
    return res.data.message;
  },

  updateClass: async (class_id: string, class_name: string, class_code: string, price: number = 0, max_students: number = 50, image: string = '') => {
    const res = await api.post('/api/method/flying_class.flying_class.api.update_class', { class_id, class_name, class_code, price, max_students, image });
    return res.data.message;
  },

  deleteClass: async (class_id: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.delete_class', { class_id });
    return res.data.message;
  },

  getClassDetails: async (class_id: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_class_details', { params: { class_id } });
    return res.data.message;
  },

  submitExam: async (exam_id: string, answers: any, start_time?: string) => {
    let payload: any = { exam_id, answers: JSON.stringify(answers) };
    if (start_time) payload.start_time = start_time;
    const { data } = await api.post('/api/method/flying_class.flying_class.api.submit_exam', payload);
    return data.message;
  },

  getChatMessages: async (class_id: string, limit: number = 50) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_chat_messages', { params: { class_id, limit } });
    return res.data.message;
  },

  sendChatMessage: async (class_id: string, message: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.send_chat_message', { class_id, message });
    return res.data.message;
  },

  getClassStudents: async (class_id: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_class_students', { params: { class_id } });
    return res.data.message;
  },

  addStudent: async (class_id: string, email: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.add_student', { class_id, email });
    return res.data.message;
  },

  removeStudent: async (class_id: string, student_email: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.remove_student', { class_id, student_email });
    return res.data;
  },

  getClassDocuments: async (class_id: string, parent_folder?: string | null) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.get_class_documents', { class_id, parent_folder });
    return res.data.message.documents || [];
  },

  createDocument: async (class_id: string, document_name: string, doc_type: 'Folder' | 'Link', parent_folder?: string | null, link_url?: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.create_document', { class_id, document_name, doc_type, parent_folder, link_url });
    return res.data.message;
  },

  deleteDocument: async (doc_id: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.delete_document', { doc_id });
    return res.data.message;
  },

  toggleStudentChat: async (class_id: string, student_email: string, is_muted: number) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.toggle_student_chat', { class_id, student_email, is_muted });
    return res.data.message;
  },

  getStudentProfile: async (student_email: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_student_profile', { params: { student_email } });
    return res.data.message;
  },

  importStudents: async (class_id: string, emails: string[]) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.import_students', { class_id, emails_json: JSON.stringify(emails) });
    return res.data.message;
  },

  getTeacherProfiles: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_teacher_profiles');
    return res.data.message;
  },

  approveTeacher: async (profile_id: string, status: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.approve_teacher', { profile_id, status });
    return res.data.message;
  },

  sendOTP: async (email: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_auth.send_otp', { email });
    return res.data;
  },

  verifyOTPAndSignup: async (email: string, full_name: string, password: string, otp: string, role: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_auth.verify_otp_and_signup', {
      email, full_name, password, otp, role
    });
    return res.data;
  },

  getAdminStats: async (filterType: string = 'week') => {
    const res = await api.get(`/api/method/flying_class.flying_class.api_admin.get_admin_stats?filter_type=${filterType}`);
    return res.data.message;
  },
  
  createAdminUser: async (data: any) => {
    // using URLSearchParams for x-www-form-urlencoded format
    const params = new URLSearchParams();
    for (const key in data) {
      params.append(key, data[key]);
    }
    const res = await api.post('/api/method/flying_class.flying_class.api_admin.create_admin_user', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return res.data.message;
  },
  
  getUserProfile: async (email: string) => {
    const res = await api.get(`/api/method/flying_class.flying_class.api_admin.get_user_profile?email=${email}`);
    return res.data.message;
  },

  toggleUserStatus: async (email: string) => {
    const res = await api.post(`/api/method/flying_class.flying_class.api_admin.toggle_user_status?email=${email}`);
    return res.data.message;
  },

  deleteAdminUser: async (email: string) => {
    const res = await api.post(`/api/method/flying_class.flying_class.api_admin.delete_user?email=${email}`);
    return res.data.message;
  },

  getAIConfig: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api_admin.get_ai_config');
    return res.data.message;
  },

  updateAIConfig: async (active_model: string, gemini_api_key?: string, gpt4o_api_key?: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_admin.update_ai_config', {
      active_model, gemini_api_key, gpt4o_api_key
    });
    return res.data.message;
  },

  requestAIUnlockOTP: async () => {
    const res = await api.post('/api/method/flying_class.flying_class.api_admin.request_ai_config_unlock');
    return res.data.message;
  },

  verifyAIUnlockOTP: async (otp: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_admin.verify_ai_config_otp', { otp });
    return res.data.message;
  },

  getSystemSettings: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api_admin.get_system_settings');
    return res.data;
  },

  updateSystemSettings: async (maintenance_mode: number) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_admin.update_system_settings', {
      maintenance_mode
    });
    return res.data.message;
  },

  getAdminUsers: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api_admin.get_all_users');
    return res.data.message;
  },
  
  getAdminClasses: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api_admin.get_all_classes');
    return res.data.message;
  },

  getKYCProfiles: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api_admin.get_kyc_profiles');
    return res.data.message;
  },

  processKYC: async (profile_name: string, action: string, reason: string = '') => {
    const res = await api.post('/api/method/flying_class.flying_class.api_admin.process_kyc', { profile_name, action, reason });
    return res.data.message;
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_private', '0');
    const res = await api.post('/api/method/upload_file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.message.file_url;
  }
};

export const teacherService = {
  getProfile: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_my_teacher_profile');
    return res.data.message;
  },
  
  updateProfile: async (full_name: string, id_card_image?: string, certificate_image?: string, dob?: string, cccd_number?: string, phone?: string, avatar_data?: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.update_teacher_profile', {
      full_name, id_card_image, certificate_image, dob, cccd_number, phone, avatar_data
    });
    return res.data.message;
  },
  
  uploadKYC: async (profileName: string, idCardFile: File, certificateFile: File) => {
    const formData1 = new FormData();
    formData1.append('file', idCardFile);
    formData1.append('is_private', '0');
    const res1 = await api.post('/api/method/upload_file', formData1, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const idCardUrl = res1.data.message.file_url;

    const formData2 = new FormData();
    formData2.append('file', certificateFile);
    formData2.append('is_private', '0');
    const res2 = await api.post('/api/method/upload_file', formData2, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const certUrl = res2.data.message.file_url;

    const res = await api.post('/api/method/flying_class.flying_class.api_admin.upload_kyc', {
      id_card_url: idCardUrl,
      certificate_url: certUrl
    });
    return res.data.message;
  },
  
  getGlobalStudents: async (search_text?: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.get_global_students', { search_text });
    return res.data.message.students;
  },

  kickStudentGlobal: async (student_email: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.kick_student_global', { student_email });
    return res.data.message;
  },

  toggleStudentChatGlobal: async (student_email: string, is_muted: number) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.toggle_student_chat_global', { student_email, is_muted });
    return res.data.message;
  },

  getTeacherStatistics: async (filter_type: string = 'year', filter_value?: string, year?: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.get_teacher_statistics', { filter_type, filter_value, year });
    return res.data.message;
  },

  getTeacherDashboardSummary: async () => {
    const res = await api.post('/api/method/flying_class.flying_class.api.get_teacher_dashboard_summary');
    return res.data.message.data;
  },

  getTeacherExams: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_teacher_exams');
    return res.data.message;
  },

  getExamResultsForTeacher: async (exam_id: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_exam_results_for_teacher', { params: { exam_id } });
    return res.data.message;
  },
  
  generateMockExam: async (prompt: string, numQuestions: number, file?: File | null) => {
    if (file) {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('num_questions', numQuestions.toString());
      formData.append('file', file);
      const res = await api.post('/api/method/flying_class.flying_class.api.generate_ai_exam', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.message;
    } else {
      const res = await api.post('/api/method/flying_class.flying_class.api.generate_ai_exam', { prompt, num_questions: numQuestions });
      return res.data.message;
    }
  },

  saveExamSchedule: async (examName: string, classLink: string, startTime: string, endTime: string, durationMinutes: number, questions: any[], maxAttempts: number = 1) => {
    const payload: any = { exam_name: examName, class_link: classLink, duration_minutes: durationMinutes, questions, max_attempts: maxAttempts };
    if (startTime) payload.start_time = startTime;
    if (endTime) payload.end_time = endTime;
    const res = await api.post('/api/method/flying_class.flying_class.api.save_exam_schedule', payload);
    return res.data.message;
  },

  editExamSchedule: async (examId: string, title: string, startTime: string, endTime: string, durationMinutes: number, maxAttempts: number) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.edit_exam_schedule', {
      exam_id: examId, title, start_time: startTime || null, end_time: endTime || null, duration_minutes: durationMinutes, max_attempts: maxAttempts
    });
    return res.data.message;
  },

  toggleExamStatus: async (examId: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.toggle_exam_status', { exam_id: examId });
    return res.data.message;
  },

  closeAllExams: async () => {
    const res = await api.post('/api/method/flying_class.flying_class.api.close_all_exams');
    return res.data.message;
  },
  
  closeExam: async (exam_id: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.close_exam', { exam_id });
    return res.data.message;
  },
  
  getExamResultDetail: async (result_id: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_exam_result_detail', { params: { result_id } });
    return res.data.message;
  },

  // --- CHAT HISTORY APIs ---
  getChatSessions: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api_chat.get_chat_sessions');
    return res.data.message;
  },
  createChatSession: async (title: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_chat.create_chat_session', { title });
    return res.data.message;
  },
  saveChatMessage: async (session_name: string, role: string, content: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api_chat.save_chat_message', { session_name, role, content });
    return res.data.message;
  },
  getChatHistory: async (session_name: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api_chat.get_chat_history', { params: { session_name } });
    return res.data.message;
  },

  // --- EXAM BANK APIs ---
  saveExamToBank: async (title: string, duration: number, questions: any[]) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.save_exam_to_bank', { title, duration, questions });
    return res.data.message;
  },

  deleteExamFromBank: async (exam_name: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.delete_exam_from_bank', { exam_name });
    return res.data.message;
  },

  updateExamInBank: async (exam_name: string, title: string, duration: number, questions: any[]) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.update_exam_in_bank', { exam_name, title, duration, questions });
    return res.data.message;
  },
};

export const studentService = {
  getOverview: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_student_overview');
    return res.data.message.data;
  },
  
  updateProfile: async (full_name?: string, gender?: string, mobile_no?: string, dob?: string, cccd_number?: string, new_password?: string, avatar_data?: string) => {
    const res = await api.post('/api/method/flying_class.flying_class.api.update_student_profile', {
      full_name, gender, mobile_no, dob, cccd_number, new_password, avatar_data
    });
    return res.data.message;
  },
  
  getDashboardData: async () => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_student_dashboard_data');
    return res.data.message;
  },
  
  getExamResults: async (time_filter?: string) => {
    const res = await api.get('/api/method/flying_class.flying_class.api.get_student_exam_results', {
      params: { time_filter }
    });
    return res.data.message;
  },
};
