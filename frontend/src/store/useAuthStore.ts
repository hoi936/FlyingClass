import { create } from 'zustand';
import { api } from '../services/api';

interface User {
  email: string;
  full_name: string;
  roles: string[];
  kyc_status?: string | null;
  rejection_reason?: string | null;
  id_card_image?: string | null;
  certificate_image?: string | null;
  user_image?: string | null;
  mobile_no?: string | null;
  dob?: string | null;
  cccd_number?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/method/flying_class.flying_class.api_auth.custom_login', { usr: email, pwd: password });
      
      const responseData = res.data.message || res.data;
      if (responseData.success === false) {
        set({ error: responseData.message, isLoading: false });
        return false;
      }

      if (responseData.message === 'Đăng nhập thành công' || responseData === 'Logged In') {
        // Fetch user info for roles
        const infoRes = await api.get('/api/method/flying_class.flying_class.api.get_user_info');
        const userInfo = infoRes.data.message;
        
        set({ user: { 
          email: userInfo.email, 
          full_name: userInfo.full_name, 
          roles: userInfo.roles,
          kyc_status: userInfo.kyc_status,
          rejection_reason: userInfo.rejection_reason,
          id_card_image: userInfo.id_card_image,
          certificate_image: userInfo.certificate_image,
          user_image: userInfo.user_image,
          mobile_no: userInfo.mobile_no,
          dob: userInfo.dob,
          cccd_number: userInfo.cccd_number
        }, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        set({ error: 'Đăng nhập thất bại', isLoading: false });
        return false;
      }
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.', isLoading: false });
      return false;
    }
  },

  loginWithToken: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/api/method/flying_class.flying_class.api_auth.login_with_token', { token });
      const responseData = res.data.message || res.data;
      if (responseData.success === false) {
        set({ error: responseData.message, isLoading: false });
        return false;
      }

      // Fetch user info for roles
      const infoRes = await api.get('/api/method/flying_class.flying_class.api.get_user_info');
      const userInfo = infoRes.data.message;
      
      set({ user: { 
        email: userInfo.email, 
        full_name: userInfo.full_name, 
        roles: userInfo.roles,
        kyc_status: userInfo.kyc_status,
        rejection_reason: userInfo.rejection_reason,
        id_card_image: userInfo.id_card_image,
        certificate_image: userInfo.certificate_image,
        user_image: userInfo.user_image,
        mobile_no: userInfo.mobile_no,
        dob: userInfo.dob,
        cccd_number: userInfo.cccd_number
      }, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Đăng nhập bằng Google thất bại.', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/api/method/logout');
      set({ user: null, isAuthenticated: false });
    } catch (err) {
      console.error(err);
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const infoRes = await api.get('/api/method/flying_class.flying_class.api.get_user_info');
      const userInfo = infoRes.data.message;
      if (userInfo && userInfo.email) {
        set({ user: { 
          email: userInfo.email, 
          full_name: userInfo.full_name, 
          roles: userInfo.roles,
          kyc_status: userInfo.kyc_status,
          rejection_reason: userInfo.rejection_reason,
          id_card_image: userInfo.id_card_image,
          certificate_image: userInfo.certificate_image,
          user_image: userInfo.user_image,
          mobile_no: userInfo.mobile_no,
          dob: userInfo.dob,
          cccd_number: userInfo.cccd_number
        }, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
