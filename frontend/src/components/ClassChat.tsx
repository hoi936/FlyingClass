import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/api';

interface Message {
  id: string;
  sender_email: string;
  sender: string;
  message: string;
  time: string;
  is_teacher: number;
}

interface ClassChatProps {
  classId: string;
}

const ClassChat: React.FC<ClassChatProps> = ({ classId }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [classId]);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/api/method/flying_class.api.get_chat_messages', { params: { class_id: classId } });
      setMessages(res.data.message?.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await api.post('/api/method/flying_class.api.send_chat_message', {
        class_id: classId,
        message: newMessage
      });
      setNewMessage('');
      fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-lg">
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80">
        <h3 className="font-bold text-lg flex items-center">
          <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>
          Thảo luận lớp học
        </h3>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-slate-500 italic">
            Chưa có tin nhắn nào. Hãy là người đầu tiên!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_email === user?.email;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 ml-1">{isMe ? 'Bạn' : msg.sender} {msg.is_teacher ? '(Giáo viên)' : ''}</span>
                <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-blue-600 text-slate-900 dark:text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <form onSubmit={sendMessage} className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-900 dark:text-white p-2.5 rounded-xl transition-colors">
          <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </form>
    </div>
  );
};

export default ClassChat;
