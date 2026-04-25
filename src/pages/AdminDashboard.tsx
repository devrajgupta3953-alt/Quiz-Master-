import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Play, LayoutGrid, Clock, Loader2, Zap, ArrowRight, Copy } from 'lucide-react';
import { quizService, roomService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import { Quiz } from '../types';
import { motion } from 'motion/react';

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadQuizzes();
    }
  }, [user]);

  const loadQuizzes = async () => {
    if (!user) return;
    const data = await quizService.getAdminQuizzes(user.uid);
    setQuizzes(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quiz?')) {
      await quizService.deleteQuiz(id);
      loadQuizzes();
    }
  };

  const handleDuplicate = async (id: string) => {
    setLoading(true);
    await quizService.duplicateQuiz(id);
    await loadQuizzes();
    setLoading(false);
  };

  const handleStartRoom = async (quizId: string, mode: Room['playMode'] = 'live') => {
    if (!user) return;
    const room = await roomService.createRoom(user.uid, quizId, mode);
    if (room) {
      navigate(`/admin/room/${room.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-center pb-8 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center border-2 border-border shadow-sm">
              <Zap className="w-8 h-8 text-brand fill-brand" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-text-main">Your Study Library</h1>
              <p className="text-text-sub text-sm font-medium">Welcome, {user?.displayName || 'Educator'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => logout()}
              className="text-text-sub hover:text-text-main text-sm font-bold transition-colors"
            >
              Log Out
            </button>
            <button
              onClick={() => navigate('/admin/create')}
              className="quizlet-btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              CREATE SET
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-10 h-10 text-brand animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quizzes.map((quiz, i) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="quizlet-card flex flex-col group relative overflow-hidden"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(quiz.id)}
                    className="p-2 text-text-sub hover:text-brand bg-white shadow-sm border border-border rounded-lg transition-colors"
                    title="Duplicate Set"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="p-2 text-text-sub hover:text-red-500 bg-white shadow-sm border border-border rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-4">
                   <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-widest">
                     <LayoutGrid className="w-4 h-4" />
                     {quiz.questions.length} Terms
                   </div>
                   <h3 className="text-xl font-bold leading-tight group-hover:text-brand transition-colors">
                     {quiz.title}
                   </h3>
                   <div className="flex items-center gap-2 text-text-sub font-bold text-[10px] uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      {quiz.questions.reduce((acc, q) => acc + q.timeLimit, 0)}s estimated
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-3">
                   <button
                    onClick={() => handleStartRoom(quiz.id, 'live')}
                    className="bg-brand text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-dark transition-all flex items-center justify-center gap-2 group/btn shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current group-hover/btn:scale-110 transition-transform" />
                    Live Session
                  </button>
                  <button
                    onClick={() => handleStartRoom(quiz.id, 'self-paced')}
                    className="bg-bg border border-border text-brand py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-brand transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <Clock className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                    Anytime
                  </button>
                </div>
              </motion.div>
            ))}

            {quizzes.length === 0 && (
              <div className="col-span-full py-24 text-center border-4 border-dashed border-border rounded-3xl bg-white/50 backdrop-blur-sm">
                <p className="text-text-sub mb-6 font-bold text-xl">Your library is empty.</p>
                <button
                  onClick={() => navigate('/admin/create')}
                  className="quizlet-btn-primary"
                >
                  Create your first set
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
