import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Users, Award, PlayCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';

const Login = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithToken, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const autoLogin = async () => {
        setTokenLoading(true);
        const success = await loginWithToken(token);
        setTokenLoading(false);
        if (success) {
          navigate('/');
        }
      };
      autoLogin();
    }
  }, [token]);
  
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/');
    }
  };

  const handleSendForgotOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError('Định dạng email không hợp lệ.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await authService.forgotPasswordSendOTP(forgotEmail);
      if (res) {
        if (!res.success) {
          setForgotError(res.message || 'Không thể gửi OTP');
          return;
        }
        setForgotStep(2);
        if (res.message && res.message.includes('Dev Mode:')) {
          alert(res.message);
        }
      } else {
        setForgotError('Không thể gửi OTP');
      }
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Không thể gửi OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authService.forgotPasswordVerifyOTP(forgotEmail, forgotOtp);
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Mã OTP không hợp lệ');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setForgotError('Mật khẩu phải dài ít nhất 8 ký tự, bao gồm cả chữ và số.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await authService.forgotPasswordReset(forgotEmail, forgotOtp, newPassword);
      setForgotSuccess('Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.');
      setTimeout(() => {
        setShowForgotPwd(false);
        setForgotStep(1);
        setForgotSuccess(null);
        setForgotEmail('');
        setForgotOtp('');
        setNewPassword('');
      }, 3000);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally {
      setForgotLoading(false);
    }
  };

  if (tokenLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Đang đăng nhập bằng Google...</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex font-sans relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/30 dark:bg-blue-600/20 blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-400/30 dark:bg-cyan-600/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-purple-400/20 dark:bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="flex-1 flex flex-col justify-center py-6 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 z-10 w-full lg:w-1/2">
        <div className="mx-auto w-full max-w-sm lg:w-[380px]">
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <img src="/logo.png" alt="FlyingClass Logo" className="relative w-20 h-20 rounded-2xl shadow-xl object-cover mix-blend-multiply dark:mix-blend-normal" />
            </div>
            <h2 className="mt-4 text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">
              FlyingClass
            </h2>
            <p className="mt-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
              Nền tảng học tập trực tuyến thông minh
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl py-6 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-3xl border border-white/20 dark:border-slate-700/50">
          
          {showForgotPwd ? (
            <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-6">Khôi phục mật khẩu</h3>
              
              {forgotSuccess ? (
                <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-center mb-6">
                  {forgotSuccess}
                </div>
              ) : forgotStep === 1 ? (
                <form className="space-y-6" onSubmit={handleSendForgotOTP}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email đã đăng ký</label>
                    <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="user@example.com" />
                  </div>
                  {forgotError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{forgotError}</div>}
                  <button type="submit" disabled={forgotLoading} className="w-full flex justify-center py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50">
                    {forgotLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                  </button>
                </form>
              ) : forgotStep === 2 ? (
                <form className="space-y-6" onSubmit={handleVerifyOTP}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mã OTP (gửi qua email)</label>
                    <input type="text" required maxLength={6} value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} className="mt-1 block w-full px-3 py-2 text-center text-xl tracking-[0.3em] font-mono border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••" />
                  </div>
                  {forgotError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{forgotError}</div>}
                  <button type="submit" disabled={forgotLoading} className="w-full flex justify-center py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50">
                    {forgotLoading ? 'Đang kiểm tra...' : 'Xác nhận OTP'}
                  </button>
                </form>
              ) : (
                <form className="space-y-6" onSubmit={handleResetPassword}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu mới</label>
                    <div className="mt-1 relative">
                      <input type={showNewPassword ? "text" : "password"} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  {forgotError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{forgotError}</div>}
                  <button type="submit" disabled={forgotLoading} className="w-full flex justify-center py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-900 dark:text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50">
                    {forgotLoading ? 'Đang xử lý...' : 'Xác nhận Đổi mật khẩu'}
                  </button>
                </form>
              )}
              
              <button type="button" onClick={() => {setShowForgotPwd(false); setForgotError(null); setForgotStep(1);}} className="w-full mt-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                &larr; Quay lại đăng nhập
              </button>
            </div>
          ) : (
            <>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email hoặc Tên đăng nhập
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="admin / user@domain.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Mật khẩu
                </label>
                <button type="button" onClick={() => setShowForgotPwd(true)} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">Quên mật khẩu?</button>
              </div>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-slate-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900 dark:text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Đăng nhập'}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400">Hoặc tiếp tục với</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-700 hover:text-slate-900 dark:text-white transition-all"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Đăng nhập bằng Google
              </button>
            </div>
          </div>
          <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
              Đăng ký ngay
            </Link>
          </div>
          </>
          )}
        </div>
      </div>
      </div>

      {/* Right side banner for large screens */}
      <div className="hidden lg:block relative w-0 flex-1 z-10">
        <div className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat overflow-hidden" style={{ backgroundImage: "url('/banner_bg.png')" }}>
          {/* Overlay to ensure text readability */}
          <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 via-indigo-900/20 to-transparent"></div>
          
          <div className="flex flex-col justify-center h-full px-20 relative z-20">
            <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">
              Khám phá chân trời <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">
                tri thức mới
              </span>
            </h1>
            <p className="text-xl text-blue-100 max-w-xl leading-relaxed drop-shadow-md">
              Trải nghiệm môi trường học tập tương tác, hiện đại và hiệu quả. Nơi mọi bài giảng đều là một chuyến bay khám phá.
            </p>
            
            <div className="mt-12 flex flex-col gap-4">
              <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-lg w-max hover:bg-white/20 transition-colors">
                <div className="bg-blue-500/30 p-2 rounded-xl">
                  <Users className="text-blue-100 w-6 h-6" />
                </div>
                <div>
                  <div className="text-white font-bold text-lg">10k+ Học viên</div>
                  <div className="text-blue-200 text-sm">Cộng đồng học tập sôi nổi</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-lg hover:bg-white/20 transition-colors">
                  <PlayCircle className="text-cyan-300 w-6 h-6" />
                  <span className="text-white font-medium">500+ Bài giảng</span>
                </div>
                <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20 shadow-lg hover:bg-white/20 transition-colors">
                  <Award className="text-purple-300 w-6 h-6" />
                  <span className="text-white font-medium">Cấp chứng chỉ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
