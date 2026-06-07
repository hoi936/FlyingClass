import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { classService, authService } from '../services/api';

const Register = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('FC Student');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const fullNameParam = params.get('full_name');
    if (emailParam) setEmail(emailParam);
    if (fullNameParam) setFullName(fullNameParam);
  }, [location]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Định dạng email không hợp lệ.');
      return;
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await classService.sendOTP(email);
      if (res && res.message) {
        if (!res.message.success) {
          setError(res.message.message || 'Không thể gửi OTP. Vui lòng thử lại.');
          return;
        }
        setStep(2);
        if (res.message.message && res.message.message.includes('Dev Mode:')) {
          alert(res.message.message);
        }
      } else {
        setError('Không thể gửi OTP. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await classService.verifyOTPAndSignup(email, fullName, password, otp, role);
      navigate('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await authService.getGoogleAuthUrl();
      if (res && res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res?.message || 'Không thể lấy URL đăng nhập Google');
      }
    } catch (err: any) {
      alert('Có lỗi xảy ra khi kết nối Google');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px]"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-lg shadow-emerald-500/30 text-xl">FC</div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Tạo tài khoản mới
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
          Gia nhập cộng đồng <span className="font-semibold text-emerald-400">FlyingClass</span> ngay hôm nay
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-2xl sm:px-10 border border-slate-200/50 dark:border-slate-700/50">
          
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleSendOTP}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div 
                  onClick={() => setRole('FC Student')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${role === 'FC Student' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:border-slate-600'}`}
                >
                  <h3 className={`font-semibold ${role === 'FC Student' ? 'text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>Học sinh</h3>
                  <p className="text-xs text-slate-500 mt-1">Tham gia lớp học</p>
                </div>
                <div 
                  onClick={() => setRole('FC Teacher')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${role === 'FC Teacher' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:border-slate-300 dark:border-slate-600'}`}
                >
                  <h3 className={`font-semibold ${role === 'FC Teacher' ? 'text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>Giáo viên</h3>
                  <p className="text-xs text-slate-500 mt-1">Tạo và dạy học</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Họ và tên</label>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
                <div className="mt-1 relative">
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{error}</div>}

              <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-900 dark:text-white font-medium rounded-lg disabled:opacity-50 transition-all">
                {loading ? 'Đang gửi...' : 'Tiếp tục (Gửi mã OTP)'}
              </button>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400">Hoặc</span></div>
                </div>
                <button type="button" onClick={handleGoogleLogin} className="mt-6 w-full flex justify-center py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700 hover:text-slate-900 dark:text-white transition-all">
                  Đăng nhập bằng Google
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleVerifyAndRegister}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Xác thực Email</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Chúng tôi đã gửi mã OTP gồm 6 chữ số tới email<br/><strong className="text-slate-700 dark:text-slate-300">{email}</strong></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 text-center mb-2">Nhập mã OTP</label>
                <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="block w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="••••••" />
              </div>

              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{error}</div>}

              <button type="submit" disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-900 dark:text-white font-medium rounded-lg disabled:opacity-50 transition-all">
                {loading ? 'Đang xử lý...' : 'Xác nhận & Hoàn tất'}
              </button>
              
              <button type="button" onClick={() => setStep(1)} className="w-full py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                &larr; Quay lại
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
