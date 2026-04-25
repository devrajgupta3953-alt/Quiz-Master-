import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, ArrowRight, Loader2 } from 'lucide-react';
import { roomService } from '../services/quizService';
import { participantService } from '../services/participantService';
import { useAuth } from '../context/AuthContext';
import { Room } from '../types';

export default function JoinRoom() {
  const { code } = useParams<{ code: string }>();
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const { loginAnonymously, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoom = async () => {
      if (!code) return;
      const data = await roomService.getRoomByCode(code);
      if (!data) {
        alert('Room not found');
        navigate('/');
      } else {
        setRoom(data);
      }
      setLoading(false);
    };
    fetchRoom();
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || !room) return;

    try {
      if (!user) await loginAnonymously();
      // Auth context updates locally then we join
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    // Once user is logged in (anon), and we have room + submittable nickname
    const performJoin = async () => {
      if (user && nickname && room) {
        await participantService.joinRoom(room.id, user.uid, nickname);
        // Also increment participantCount
        await roomService.updateRoomStatus(room.id, room.status, {
          participantCount: (room.participantCount || 0) + 1
        });
        navigate(`/play/${room.id}`);
      }
    };
    performJoin();
  }, [user]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-brand animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text-main flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-12"
      >
        <div className="text-center space-y-4">
           <div className="w-16 h-16 bg-surface border-2 border-border rounded-2xl mx-auto flex items-center justify-center shadow-sm">
             <User className="w-8 h-8 text-brand" />
           </div>
           <h1 className="text-4xl font-bold tracking-tight">Identity Check</h1>
           <p className="text-text-sub font-bold uppercase tracking-widest text-xs">Room ID: <span className="text-brand">{code}</span></p>
        </div>

        <motion.form
          onSubmit={handleJoin}
          className="bg-surface p-10 rounded-[2.5rem] border border-border space-y-8 shadow-xl"
        >
          <div className="space-y-4">
            <label className="text-sm font-bold uppercase tracking-widest text-text-sub block">Choose a Nickname</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Einstein22"
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-bg border-2 border-border rounded-xl p-5 text-2xl font-bold focus:border-brand focus:outline-none transition-all placeholder:opacity-30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!nickname}
            className="quizlet-btn-primary w-full py-5 text-xl flex items-center justify-center gap-3 shadow-lg active:scale-95"
          >
            I'M READY
            <ArrowRight className="w-6 h-6" />
          </button>

          <p className="text-center text-xs text-text-sub font-medium leading-relaxed">
            By joining, you agree to our fair play guidelines. <br /> May the best study master win!
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
