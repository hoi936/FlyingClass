import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TeacherKYC = () => {
  const { user, checkAuth, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [dob, setDob] = useState((user as any)?.dob || '');
  const [cccdNumber, setCccdNumber] = useState((user as any)?.cccd_number || '');
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const status = user?.kyc_status;
  const isPendingView = status === 'Pending' && !isEditing;
  const isRejectedView = status === 'Rejected' && !isEditing;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('is_private', '0');
    
    const res = await api.post('/api/method/upload_file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.message.file_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cccdNumber && !/^\d{12}$/.test(cccdNumber)) {
      setError('CCCD/CMND phải bao gồm đúng 12 chữ số.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      let idCardUrl = '';
      let certificateUrl = '';

      if (idCardFile) {
        idCardUrl = await uploadFile(idCardFile);
      }
      if (certificateFile) {
        certificateUrl = await uploadFile(certificateFile);
      }

      await api.post('/api/method/flying_class.flying_class.api.update_teacher_profile', {
        full_name: fullName,
        id_card_image: idCardUrl,
        certificate_image: certificateUrl,
        phone: phone,
        dob: dob,
        cccd_number: cccdNumber
      });

      // Refresh auth to update status
      await checkAuth();
      setIsEditing(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPendingView) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700 text-center">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Hồ sơ đang chờ duyệt</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Thông tin của bạn đã được gửi đi và đang được Ban Quản Trị xem xét. Quá trình này có thể mất tối đa 24 giờ làm việc.
          </p>
          
          <div className="mb-8 text-left bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <h3 className="text-slate-900 dark:text-white font-medium mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Tài liệu đã tải lên</h3>
            <div className="space-y-3">
              {user?.id_card_image && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">CCCD/CMND:</span>
                  <a href={`http://127.0.0.1:8001${user.id_card_image}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm flex items-center">
                    Xem file
                  </a>
                </div>
              )}
              {user?.certificate_image && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Bằng cấp:</span>
                  <a href={`http://127.0.0.1:8001${user.certificate_image}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-sm flex items-center">
                    Xem file
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <button 
              onClick={() => setIsEditing(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              Sửa hồ sơ & Gửi lại
            </button>
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Xác minh tài khoản Giáo viên</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Cập nhật thông tin để hoàn tất hồ sơ</p>
          </div>
          <button onClick={handleLogout} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white">
            Đăng xuất
          </button>
        </div>

        {isRejectedView && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <h3 className="text-red-400 font-semibold mb-1">Hồ sơ bị từ chối</h3>
            <p className="text-red-300 text-sm">{user?.rejection_reason || 'Thông tin chưa hợp lệ. Vui lòng cập nhật lại.'}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Họ và tên</label>
            <input 
              type="text" 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Nhập họ và tên đầy đủ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số điện thoại</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Nhập số điện thoại liên hệ"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ngày sinh</label>
              <input 
                type="date" 
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số CCCD</label>
              <input 
                type="text" 
                value={cccdNumber}
                onChange={(e) => setCccdNumber(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Nhập số CCCD"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ảnh CCCD / CMND</label>
            <input 
              type="file" 
              accept="image/*"
              required={!isEditing}
              onChange={(e) => setIdCardFile(e.target.files?.[0] || null)}
              className="w-full text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chứng chỉ chuyên môn / Bằng cấp</label>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              required={!isEditing}
              onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
              className="w-full text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Gửi xác minh'}
            </button>
            {isEditing && (
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
              >
                Hủy
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeacherKYC;
