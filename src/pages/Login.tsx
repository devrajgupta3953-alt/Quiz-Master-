import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Zap, Play, ShieldCheck, ArrowRight, User } from 'lucide-react';

export default function Login() {
  const [roomCode, setRoomCode] = useState('');
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      navigate(`/join/${roomCode}`);
    }
  };

  const handleHost = async () => {
    if (!user) {
      await loginWithGoogle();
    }
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div 
          className="flex flex-col items-center gap-4 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg">
            <Zap className="w-10 h-10 text-white fill-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text-main">
            Welcome Back
          </h1>
          <p className="text-text-sub font-medium">Choose how you want to interact today</p>
        </div>

        <div className="space-y-6">
          {/* Join Section */}
          <div className="bg-white p-8 rounded-3xl border-2 border-border shadow-sm space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Joining a Game?</h2>
              <p className="text-text-sub text-sm font-medium italic">Enter your 6-digit room code to start playing</p>
            </div>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                maxLength={6}
                placeholder="000 000"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-bg border-2 border-border rounded-xl p-4 text-4xl font-mono tracking-[0.3em] text-center focus:border-brand focus:outline-none transition-all placeholder:opacity-20"
              />
              <button
                type="submit"
                disabled={roomCode.length !== 6}
                className="quizlet-btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 group"
              >
                JOIN SESSION
                <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-bg px-4 text-text-sub font-bold tracking-widest">OR</span>
            </div>
          </div>

          {/* Host Section */}
          <button
            onClick={handleHost}
            className="quizlet-btn-secondary w-full py-6 flex flex-col items-center gap-2 hover:bg-slate-50 border-gray-200"
          >
            <div className="flex items-center gap-2">
              {user ? (
                <ShieldCheck className="w-5 h-5 text-brand" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              )}
              <span className="text-lg">Log in as <span className="font-black">Host</span></span>
            </div>
            <p className="text-xs text-text-sub font-medium">Create quizzes, manage rooms, and track scores</p>
          </button>
        </div>

        <button 
          onClick={() => navigate('/')}
          className="w-full text-text-sub hover:text-brand text-sm font-bold flex items-center justify-center gap-2 transition-colors py-4"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Homepage
        </button>
      </motion.div>
    </div>
  );
}
