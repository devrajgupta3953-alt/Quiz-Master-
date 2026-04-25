import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Play, Trophy, Users2, ChevronRight, Hash } from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { roomService } from '../services/quizService';
import { participantService } from '../services/participantService';
import { Room, Participant, Quiz } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function AdminRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), async (snapshot) => {
      if (snapshot.exists()) {
        const roomData = { id: snapshot.id, ...snapshot.data() } as Room;
        setRoom(roomData);

        if (!quiz) {
          const quizSnap = await getDoc(doc(db, 'quizzes', roomData.quizId));
          if (quizSnap.exists()) {
            setQuiz({ id: quizSnap.id, ...quizSnap.data() } as Quiz);
          }
        }
      } else {
        navigate('/admin');
      }
    });

    const subParticipants = participantService.onParticipantsChange(roomId, (data) => {
      setParticipants(data);
    });

    return () => {
      unsubscribe();
      subParticipants();
    };
  }, [roomId, quiz]);

  const handleStartGame = async () => {
    if (!roomId) return;
    await roomService.updateRoomStatus(roomId, 'question', {
      currentQuestionIndex: 0,
      questionStartTime: new Date()
    });
  };

  const handleNext = async () => {
    if (!room || !quiz || !roomId) return;
    const nextIndex = room.currentQuestionIndex + 1;
    if (nextIndex < quiz.questions.length) {
      await roomService.updateRoomStatus(roomId, 'question', {
        currentQuestionIndex: nextIndex,
        questionStartTime: new Date()
      });
    } else {
      await roomService.updateRoomStatus(roomId, 'finished');
    }
  };

  const handleShowLeaderboard = async () => {
    if (!roomId) return;
    await roomService.updateRoomStatus(roomId, 'leaderboard');
  };

  if (!room || !quiz) return null;

  return (
    <div className="min-h-screen bg-bg text-text-main p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-12">
        {/* Lobby State */}
        {room.status === 'lobby' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-16 py-12"
          >
            <div className="space-y-6">
              <h1 className="text-3xl font-bold tracking-tight text-text-sub uppercase tracking-[0.2em]">Join with code</h1>
              <div className="relative group inline-block">
                <span className="text-[12rem] font-black tracking-tighter text-brand leading-none drop-shadow-sm select-all">
                  {room.roomCode}
                </span>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-2 bg-brand/10 rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="bg-white p-10 rounded-[2rem] border border-border shadow-sm">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                     <Users className="w-6 h-6 text-brand" />
                     <span className="text-lg font-bold">Participants</span>
                  </div>
                  <span className="bg-brand/10 text-brand px-3 py-1 rounded-full font-bold text-sm">{participants.length}</span>
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <AnimatePresence>
                    {participants.map((p) => (
                      <motion.span
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-bg border border-border px-6 py-2 rounded-xl text-base font-bold text-brand shadow-sm"
                      >
                        {p.nickname}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  {participants.length === 0 && (
                    <p className="text-text-sub italic font-medium">Waiting for first player...</p>
                  )}
                </div>
              </div>

              <div className="space-y-8 flex flex-col justify-center h-full bg-white p-10 rounded-[2rem] border border-border shadow-sm">
                <div className="text-left space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-text-sub">Active Study Set</span>
                  <h2 className="text-3xl font-bold leading-tight">{quiz.title}</h2>
                  <div className="flex items-center gap-2 text-brand font-bold text-sm">
                    <Hash className="w-4 h-4" />
                    {quiz.questions.length} Terms to master
                  </div>
                </div>
                <button
                  onClick={handleStartGame}
                  disabled={participants.length === 0}
                  className="quizlet-btn-primary w-full py-6 text-2xl shadow-xl flex items-center justify-center gap-4"
                >
                  <Play className="w-8 h-8 fill-current" />
                  START GAME
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Question/Game States */}
        {['question', 'feedback', 'leaderboard'].includes(room.status) && (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-bg text-brand w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl border border-border">
                  {room.currentQuestionIndex + 1}
                </div>
                <div className="h-2 w-48 bg-bg rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((room.currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    className="h-full bg-brand"
                  />
                </div>
                <span className="text-text-sub text-xs font-bold uppercase tracking-widest leading-none">
                  {room.currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2 text-text-sub">
                    <Users2 className="w-5 h-5" />
                    <span className="font-bold text-lg">{participants.length} Active</span>
                 </div>
                 <button
                  onClick={room.status === 'leaderboard' ? handleNext : handleShowLeaderboard}
                  className="quizlet-btn-primary py-2 px-6 text-sm flex items-center gap-2"
                >
                  {room.status === 'leaderboard' ? 'NEXT QUESTION' : 'CHECK SCORES'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {room.status !== 'leaderboard' && (
              <motion.div
                key={room.currentQuestionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface p-12 rounded-[2.5rem] border border-border text-center min-h-[400px] flex flex-col justify-center gap-12 shadow-sm"
              >
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-brand bg-brand/5 px-4 py-1 rounded-full border border-brand/10">
                    {quiz.questions[room.currentQuestionIndex].type.replace('-', ' ')}
                  </span>
                  <h1 className="text-5xl font-bold leading-tight tracking-tight">
                    {quiz.questions[room.currentQuestionIndex].text}
                  </h1>
                </div>

                <div className="max-w-3xl mx-auto w-full">
                  {(quiz.questions[room.currentQuestionIndex].type === 'multiple-choice' || 
                    quiz.questions[room.currentQuestionIndex].type === 'true-false') && (
                    <div className="grid grid-cols-2 gap-6">
                      {quiz.questions[room.currentQuestionIndex].options?.map((opt, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-8 rounded-2xl border-2 text-left text-xl transition-all font-bold shadow-sm",
                            quiz.questions[room.currentQuestionIndex].correctOptionIndex === i
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-border bg-bg text-text-sub/50"
                          )}
                        >
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-xs uppercase tracking-widest font-black opacity-40">Option {String.fromCharCode(65 + i)}</span>
                            {quiz.questions[room.currentQuestionIndex].correctOptionIndex === i && (
                              <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">Correct Answer</span>
                            )}
                          </div>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {quiz.questions[room.currentQuestionIndex].type === 'fill-in-blank' && (
                    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-10 space-y-4">
                       <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block">Correct Entry:</span>
                       <div className="text-4xl font-black text-emerald-700 underline decoration-brand decoration-4 underline-offset-8">
                         {quiz.questions[room.currentQuestionIndex].correctText}
                       </div>
                    </div>
                  )}

                  {quiz.questions[room.currentQuestionIndex].type === 'matching' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {quiz.questions[room.currentQuestionIndex].pairs?.map((pair) => (
                        <div key={pair.id} className="bg-white border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm">
                           <span className="text-sm font-bold text-text-main">{pair.key}</span>
                           <div className="w-4 h-0.5 bg-brand/20" />
                           <span className="text-xs font-bold text-brand uppercase tracking-widest">{pair.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {room.status === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8 max-w-2xl mx-auto w-full"
              >
                <div className="text-center space-y-4">
                   <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    Session Leaderboard
                   </h2>
                   <p className="text-text-sub font-medium italic">Accuracy is key to winning</p>
                </div>
                
                <div className="space-y-3">
                  {participants.sort((a, b) => b.score - a.score).slice(0, 5).map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 rounded-2xl border border-border flex justify-between items-center shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <span className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black text-sm",
                          i === 0 ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-200" :
                          i === 1 ? "bg-slate-100 text-slate-700 border-2 border-slate-200" :
                          i === 2 ? "bg-amber-50 text-amber-900 border-2 border-amber-100" : "bg-bg text-text-sub border border-border"
                        )}>
                          {i + 1}
                        </span>
                        <span className="text-xl font-bold">{p.nickname}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-brand font-mono text-3xl font-black italic">
                          {p.score}
                        </span>
                        <span className="text-[10px] font-black uppercase text-text-sub tracking-widest pt-2">PTS</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Finished State */}
        {room.status === 'finished' && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center py-12 space-y-12"
          >
            <div className="relative inline-block">
               <Trophy className="w-32 h-32 text-yellow-500 mx-auto" />
               <motion.div
                 animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.4, 0.1] }}
                 transition={{ repeat: Infinity, duration: 4 }}
                 className="absolute inset-0 bg-yellow-400/20 blur-[100px] -z-10"
               />
            </div>
            <div className="space-y-2">
              <h1 className="text-6xl font-bold tracking-tight">Well Done!</h1>
              <p className="text-text-sub font-bold text-xl uppercase tracking-widest">Final Rank</p>
            </div>
            
            <div className="bg-white p-12 rounded-[3rem] border-4 border-brand/10 max-w-lg mx-auto shadow-2xl relative">
              <div className="space-y-4">
                <span className="text-text-sub font-bold text-sm uppercase tracking-[0.4em] block mb-2">Grand Champion</span>
                <span className="text-5xl font-black text-brand tracking-tighter">
                  {participants.sort((a, b) => b.score - a.score)[0]?.nickname || 'No Winner'}
                </span>
                <div className="text-brand/40 font-mono text-xl font-bold uppercase tracking-widest">
                  {participants.sort((a, b) => b.score - a.score)[0]?.score || 0} Points Secured
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/admin')}
              className="quizlet-btn-secondary"
            >
              Finish Session
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
