import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title?: string;
  roleLabel?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title = 'FlyingClass', roleLabel = 'Student Portal' }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(2); // Mock for now, you can sync this later
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <nav className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div 
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-lg shadow-blue-500/20">FC</div>
            <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{title}</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <span className="hidden md:inline-flex text-sm text-slate-600 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              {roleLabel}
            </span>
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors rounded-full hover:bg-slate-100/50 dark:bg-slate-700/50 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-slate-900 dark:text-white ring-2 ring-slate-800">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Thông báo</h3>
                    <button className="text-xs text-blue-400 hover:text-blue-300">Đánh dấu đã đọc</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {/* Mock Notifications */}
                    <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100/30 dark:bg-slate-700/30 cursor-pointer transition-colors">
                      <p className="text-sm text-slate-700 dark:text-slate-300">Giáo viên đã tải lên bài giảng mới: <span className="font-medium text-slate-900 dark:text-white">React Hooks Deep Dive</span></p>
                      <p className="text-xs text-slate-500 mt-1">10 phút trước</p>
                    </div>
                    <div className="px-4 py-3 hover:bg-slate-100/30 dark:bg-slate-700/30 cursor-pointer transition-colors">
                      <p className="text-sm text-slate-700 dark:text-slate-300">Bài kiểm tra <span className="font-medium text-slate-900 dark:text-white">Midterm Exam</span> sắp hết hạn!</p>
                      <p className="text-xs text-slate-500 mt-1">1 giờ trước</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{user?.full_name || user?.email}</span>
              <button onClick={() => navigate('/profile')} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded hover:bg-slate-600 transition">Hồ sơ</button>
              <button onClick={logout} className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded hover:bg-red-500/20 transition">Đăng xuất</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;
