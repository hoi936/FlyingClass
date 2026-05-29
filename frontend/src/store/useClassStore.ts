import { create } from 'zustand';
import { classService } from '../services/api';

interface ClassData {
  class_id: string;
  class_name: string;
  teacher_name: string;
  class_code: string;
  status: string;
}

interface ClassState {
  classes: ClassData[];
  isLoading: boolean;
  error: string | null;
  fetchClasses: () => Promise<void>;
  joinClass: (class_code: string) => Promise<void>;
}

export const useClassStore = create<ClassState>((set) => ({
  classes: [],
  isLoading: false,
  error: null,
  
  fetchClasses: async () => {
    set({ isLoading: true, error: null });
    try {
      const data: any = await classService.getMyClasses();
      set({ classes: data.classes, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Lỗi khi lấy danh sách lớp', isLoading: false });
    }
  },

  joinClass: async (class_code: string) => {
    set({ isLoading: true, error: null });
    try {
      await classService.joinClass(class_code);
      // Reload classes
      const data: any = await classService.getMyClasses();
      set({ classes: data.classes, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Mã lớp không hợp lệ', isLoading: false });
    }
  }
}));
