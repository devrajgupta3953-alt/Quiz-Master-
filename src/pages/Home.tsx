import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length === 6) {
      navigate(`/join/${roomCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-12 text-center"
      >
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10"
          >
            <Zap className="w-8 h-8 text-indigo-400 fill-indigo-400/20" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-6xl font-light tracking-tight text-white">
              LiveQuiz<span className="font-bold">Master</span>
            </h1>
            <p className="text-slate-500 text-sm tracking-[0.2em] font-medium uppercase">
              The Interactive Platform
            </p>
          </div>
        </div>

        <div className="grid gap-8">
          {/* Join Room Section */}
          <motion.form
            onSubmit={handleJoin}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-10 rounded-[2.5rem] space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-30" />
            
            <div className="text-center space-y-4">
              <span className="pill-border">Enter Room Code</span>
              <input
                type="text"
                maxLength={6}
                placeholder="000 000"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-transparent border-none p-4 text-5xl font-mono tracking-[0.3em] text-center focus:outline-none placeholder:text-white/5 transition-all text-white"
              />
            </div>
            
            <button
              type="submit"
              disabled={roomCode.length !== 6}
              className={cn(
                "w-full p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all",
                roomCode.length === 6
                  ? "bg-white text-black hover:bg-slate-200"
                  : "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
              )}
            >
              <Play className="w-4 h-4 fill-current" />
              JOIN SESSION
            </button>
          </motion.form>

          {/* Admin Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-4 pt-4"
          >
            <div className="h-px w-12 bg-white/10" />
            {user ? (
              <button
                onClick={() => navigate('/admin')}
                className="text-slate-400 hover:text-white text-sm font-medium tracking-wide flex items-center gap-2 transition-all group"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400 opacity-50 group-hover:opacity-100" />
                ADMIN DASHBOARD
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="text-slate-500 hover:text-white text-sm font-medium tracking-wide flex items-center gap-2 transition-all transition-all border border-white/5 px-6 py-2 rounded-full bg-white/5"
              >
                HOST AS ADMIN
              </button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
