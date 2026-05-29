import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LessonViewer from './pages/LessonViewer';

import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherKYC from './pages/TeacherKYC';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const RoleRouter = () => {
  const { user } = useAuthStore();
  
  if (user?.roles?.includes('FC Admin') || user?.roles?.includes('System Manager')) {
    return <AdminDashboard />;
  }
  
  if (user?.roles?.includes('FC Teacher')) {
    if (user.kyc_status !== 'Approved') {
      return <TeacherKYC />;
    }
    return <TeacherDashboard />;
  }
  
  return <Dashboard />;
};

import { useThemeStore } from './store/useThemeStore';

function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <RoleRouter />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/lesson/:id" 
          element={
            <PrivateRoute>
              <LessonViewer />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
