import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Member {
  email: string;
  full_name: string;
}

interface ClassMembersProps {
  classId: string;
}

const ClassMembers: React.FC<ClassMembersProps> = ({ classId }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [classId]);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/method/flying_class.api.get_class_members', { params: { class_id: classId } });
      setMembers(res.data.message || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-lg">
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80">
        <h3 className="font-bold text-lg flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          Danh sách lớp ({members.length})
        </h3>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full text-center text-slate-500 italic py-8">
            Chưa có thành viên nào.
          </div>
        ) : (
          members.map((member, idx) => (
            <div key={idx} className="flex items-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-slate-900 dark:text-white shadow-lg mr-3">
                {(member.full_name || member.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">{member.full_name || member.email}</p>
                {member.full_name && <p className="text-xs text-slate-500">{member.email}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClassMembers;
