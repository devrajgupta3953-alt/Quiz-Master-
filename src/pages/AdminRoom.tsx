import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Play, Trophy, Users2, ChevronRight, Hash, Lock, Unlock, Zap, Brain, X, Download, BarChart3 } from 'lucide-react';
import { doc, onSnapshot, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { roomService } from '../services/quizService';
import { participantService } from '../services/participantService';
import { Room, Participant, Quiz, Response } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function AdminRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const autoPilotTimer = useRef<any>(null);

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

    // Also fetch responses for analytics when game is finished
    const fetchAllResponses = async () => {
      if (room?.status === 'finished') {
        const resSnap = await getDocs(collection(db, `rooms/${roomId}/responses`));
        const resData = resSnap.docs.map(d => d.data() as Response);
        setResponses(resData);
      }
    };
    fetchAllResponses();

    return () => {
      unsubscribe();
      subParticipants();
      if (autoPilotTimer.current) clearTimeout(autoPilotTimer.current);
    };
  }, [roomId, quiz, room?.status]);

  // Auto-pilot logic
  useEffect(() => {
    if (!room || !quiz || room.pacingMode !== 'auto-pilot') return;

    if (autoPilotTimer.current) clearTimeout(autoPilotTimer.current);

    if (room.status === 'question') {
      const q = quiz.questions[room.currentQuestionIndex];
      // Transition to leaderboard after time is up + small buffer
      autoPilotTimer.current = setTimeout(() => {
        handleShowLeaderboard();
      }, (q.timeLimit + 3) * 1000);
    } else if (room.status === 'leaderboard') {
      // Show leaderboard for 5 seconds then go to next
      autoPilotTimer.current = setTimeout(() => {
        handleNext();
      }, 5000);
    }
  }, [room?.status, room?.currentQuestionIndex, room?.pacingMode]);

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

  const exportToCsv = () => {
    if (!participants.length) return;
    const headers = ['Rank', 'Nickname', 'Points', 'Joined At'];
    const rows = participants
      .sort((a, b) => b.score - a.score)
      .map((p, i) => [i + 1, p.nickname, p.score, p.joinedAt?.toDate?.()?.toISOString() || '']);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quiz_results_${room.roomCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDifficultyMatrix = () => {
    if (!quiz || !responses.length) return [];
    return quiz.questions.map((q, idx) => {
      const qResponses = responses.filter(r => r.questionIndex === idx);
      const correctCount = qResponses.filter(r => r.isCorrect).length;
      const accuracy = qResponses.length ? (correctCount / qResponses.length) * 100 : 0;
      return { text: q.text, accuracy, total: qResponses.length };
    }).sort((a, b) => a.accuracy - b.accuracy);
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
              <div className="lg:col-span-2 bg-white p-10 rounded-[2rem] border border-border shadow-sm space-y-8">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                     <Users className="w-6 h-6 text-brand" />
                     <span className="text-lg font-bold">Participants</span>
                  </div>
                  <span className="bg-brand/10 text-brand px-3 py-1 rounded-full font-bold text-sm">{participants.length} Joined</span>
                </div>
                <div className="flex flex-wrap gap-3 justify-center max-h-[300px] overflow-y-auto p-4 custom-scrollbar">
                  <AnimatePresence>
                    {participants.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group relative"
                      >
                        <span className={cn(
                          "bg-bg border border-border px-6 py-2 rounded-xl text-base font-bold text-brand shadow-sm block",
                          p.isKicked && "opacity-30 line-through grayscale"
                        )}>
                          {p.nickname}
                        </span>
                        {!p.isKicked && (
                          <button
                            onClick={() => roomService.kickParticipant(room.id, p.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {participants.length === 0 && (
                    <p className="text-text-sub italic font-medium">Waiting for players to enter the portal...</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
                  <div className="text-left space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Current Set</span>
                      <h2 className="text-xl font-bold leading-tight line-clamp-1">{quiz.title}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-bg p-3 rounded-xl border border-border space-y-1">
                         <span className="text-[9px] font-black text-text-sub uppercase">Pacing</span>
                         <button 
                           onClick={() => roomService.setPacingMode(room.id, room.pacingMode === 'host-led' ? 'auto-pilot' : 'host-led')}
                           className="flex items-center gap-2 text-xs font-black text-brand hover:underline"
                         >
                           {room.pacingMode === 'host-led' ? <Users2 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                           {room.pacingMode === 'host-led' ? 'HOST-LED' : 'AUTO-PILOT'}
                         </button>
                      </div>
                      <div className="bg-bg p-3 rounded-xl border border-border space-y-1">
                         <span className="text-[9px] font-black text-text-sub uppercase">Access</span>
                         <button 
                           onClick={() => roomService.toggleLock(room.id, !room.isLocked)}
                           className="flex items-center gap-2 text-xs font-black text-brand hover:underline"
                         >
                           {room.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                           {room.isLocked ? 'LOCKED' : 'OPEN'}
                         </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleStartGame}
                    disabled={participants.length === 0}
                    className="quizlet-btn-primary w-full py-5 text-xl shadow-lg flex items-center justify-center gap-3"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    START SESSION
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Self-Paced Active State */}
        {room.playMode === 'self-paced' && room.status === 'question' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full space-y-8"
          >
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-border shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand/5 rounded-xl flex items-center justify-center border border-brand/10">
                    <Zap className="w-6 h-6 text-brand" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Self-Paced Session</h2>
                    <p className="text-text-sub text-xs font-bold uppercase tracking-widest">Code: <span className="text-brand">{room.roomCode}</span></p>
                  </div>
               </div>
               <button 
                onClick={() => roomService.updateRoomStatus(room.id, 'finished')}
                className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-sm"
               >
                 Close Session
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-lg font-bold">Students Progress</h3>
                    <span className="bg-bg px-3 py-1 rounded-full text-xs font-black text-brand border border-border">{participants.length} Total</span>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto px-2 custom-scrollbar">
                    {participants.sort((a,b) => b.score - a.score).map((p, i) => (
                      <div key={p.id} className="flex justify-between items-center p-4 bg-bg rounded-xl border border-border">
                         <span className="font-bold">{p.nickname}</span>
                         <span className="font-mono font-black text-brand italic">{p.score} PTS</span>
                      </div>
                    ))}
                    {participants.length === 0 && <p className="text-center py-10 text-text-sub italic">No students joined yet</p>}
                  </div>
               </div>

               <div className="bg-brand p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-center items-center text-center space-y-6">
                  <Brain className="w-16 h-16 opacity-50" />
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black italic">Live Learning Mode</h3>
                    <p className="text-white/70 font-medium">Students are going through the set at their own speed. You can see their scores updated in real-time.</p>
                  </div>
                  <div className="bg-white/10 px-6 py-4 rounded-2xl border border-white/20 font-black tracking-widest text-4xl">
                    {room.roomCode}
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {/* Question/Game States (Host-led) */}
        {['question', 'feedback', 'leaderboard'].includes(room.status) && room.playMode === 'live' && (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-4 justify-between items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-4">
                <div className="bg-bg text-brand w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl border border-border">
                  {room.currentQuestionIndex + 1}
                </div>
                <div className="h-2 w-24 md:w-48 bg-bg rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((room.currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                    className="h-full bg-brand"
                  />
                </div>
                <span className="text-text-sub text-xs font-bold uppercase tracking-widest leading-none">
                  {room.currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
                {room.pacingMode === 'auto-pilot' && (
                  <span className="bg-brand/10 text-brand text-[9px] font-black px-2 py-1 rounded-full animate-pulse">AUTO-PILOT ACTIVE</span>
                )}
              </div>
              
              <div className="flex items-center gap-6">
                 <div className="hidden sm:flex items-center gap-2 text-text-sub">
                    <Users2 className="w-5 h-5" />
                    <span className="font-bold text-lg">{participants.length} Active</span>
                 </div>
                 {room.pacingMode === 'host-led' && (
                   <button
                    onClick={room.status === 'leaderboard' ? handleNext : handleShowLeaderboard}
                    className="quizlet-btn-primary py-2 px-6 text-sm flex items-center gap-2"
                  >
                    {room.status === 'leaderboard' ? 'NEXT QUESTION' : 'CHECK SCORES'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                 )}
              </div>
            </div>

            {room.status !== 'leaderboard' && (
              <motion.div
                key={room.currentQuestionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface p-6 md:p-12 rounded-[2.5rem] border border-border text-center min-h-[400px] flex flex-col justify-center gap-12 shadow-sm"
              >
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-brand bg-brand/5 px-4 py-1 rounded-full border border-brand/10">
                      {quiz.questions[room.currentQuestionIndex].type.replace('-', ' ')}
                    </span>
                  </div>
                  
                  {quiz.questions[room.currentQuestionIndex].imageUrl && (
                    <div className="max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-xl shadow-brand/10">
                      <img 
                        src={quiz.questions[room.currentQuestionIndex].imageUrl} 
                        alt="Question visual" 
                        className="w-full h-auto max-h-[300px] object-contain bg-black"
                      />
                    </div>
                  )}

                  <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-4xl mx-auto">
                    {quiz.questions[room.currentQuestionIndex].text}
                  </h1>
                </div>

                <div className="max-w-3xl mx-auto w-full">
                  {(quiz.questions[room.currentQuestionIndex].type === 'multiple-choice' || 
                    quiz.questions[room.currentQuestionIndex].type === 'true-false') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {quiz.questions[room.currentQuestionIndex].options?.map((opt, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-6 md:p-8 rounded-2xl border-2 text-left text-lg md:text-xl transition-all font-bold shadow-sm",
                            quiz.questions[room.currentQuestionIndex].correctOptionIndices?.includes(i)
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-border bg-bg text-text-sub/50"
                          )}
                        >
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-xs uppercase tracking-widest font-black opacity-40">Option {String.fromCharCode(65 + i)}</span>
                            {quiz.questions[room.currentQuestionIndex].correctOptionIndices?.includes(i) && (
                              <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">Correct Answer</span>
                            )}
                          </div>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {quiz.questions[room.currentQuestionIndex].type === 'fill-in-blank' && (
                    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 md:p-10 space-y-4">
                       <span className="text-xs font-black uppercase tracking-widest text-emerald-600 block">Correct Entry:</span>
                       <div className="text-2xl md:text-4xl font-black text-emerald-700 underline decoration-brand decoration-4 underline-offset-8">
                         {quiz.questions[room.currentQuestionIndex].correctText}
                       </div>
                    </div>
                  )}

                  {quiz.questions[room.currentQuestionIndex].type === 'matching' && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                </div>
                
                <div className="space-y-3">
                  {participants.sort((a, b) => b.score - a.score).slice(0, 5).map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white p-6 rounded-2xl border border-border flex justify-between items-center shadow-sm"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12 pb-24"
          >
            <div className="text-center space-y-8">
              <div className="relative inline-block">
                <Trophy className="w-24 h-24 text-yellow-500 mx-auto" />
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="absolute inset-0 bg-yellow-400/10 blur-3xl -z-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl font-black tracking-tighter">Grand Finale</h1>
                <p className="text-text-sub font-black uppercase tracking-widest text-sm">Room {room.roomCode} Results</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Champion Card */}
              <div className="bg-brand p-12 rounded-[3.5rem] text-white text-center shadow-2xl space-y-8 relative overflow-hidden group">
                <Zap className="absolute top-10 left-10 w-40 h-40 text-white/10 -rotate-12 group-hover:scale-110 transition-transform" />
                <div className="relative z-10 space-y-6">
                  <span className="text-xs font-black uppercase tracking-[0.5em] opacity-60">Victory Secured By</span>
                  <div className="text-6xl font-black tracking-tighter drop-shadow-lg">
                    {participants.sort((a, b) => b.score - a.score)[0]?.nickname || 'ANONYMOUS'}
                  </div>
                  <div className="bg-white/10 backdrop-blur-md inline-block px-8 py-3 rounded-2xl border border-white/20 font-mono text-2xl font-black italic">
                    {participants.sort((a, b) => b.score - a.score)[0]?.score || 0} POINTS
                  </div>
                </div>
                <div className="flex gap-4 relative z-10 pt-4">
                   <button 
                    onClick={exportToCsv}
                    className="flex-1 bg-white text-brand px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-bg transition-colors flex items-center justify-center gap-3"
                   >
                     <Download className="w-4 h-4" />
                     Export CSV
                   </button>
                   <button 
                    onClick={() => navigate('/admin')}
                    className="flex-1 bg-black/20 text-white px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black/30 transition-colors border border-white/10"
                   >
                     Close Lobby
                   </button>
                </div>
              </div>

              {/* Difficulty Matrix */}
              <div className="bg-white p-10 rounded-[3.5rem] border border-border shadow-sm space-y-8">
                 <div className="flex items-center gap-3 border-b border-border pb-6">
                    <BarChart3 className="w-6 h-6 text-brand" />
                    <h3 className="text-2xl font-bold">Difficulty Matrix</h3>
                 </div>
                 
                 <div className="space-y-6 max-h-[400px] overflow-y-auto px-2 custom-scrollbar">
                   {getDifficultyMatrix().map((item, i) => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between items-end">
                           <span className="text-sm font-bold text-text-main line-clamp-1">{item.text}</span>
                           <span className={cn(
                             "text-[10px] font-black px-2 py-0.5 rounded-full border mb-1",
                             item.accuracy < 30 ? "bg-red-50 text-red-600 border-red-100" :
                             item.accuracy < 70 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                           )}>
                             {item.accuracy.toFixed(0)}% ACCURACY
                           </span>
                        </div>
                        <div className="h-2 bg-bg rounded-full overflow-hidden border border-border/50">
                           <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.accuracy}%` }}
                            className={cn(
                              "h-full",
                              item.accuracy < 30 ? "bg-red-500" :
                              item.accuracy < 70 ? "bg-amber-400" : "bg-emerald-500"
                            )}
                           />
                        </div>
                     </div>
                   ))}
                   {getDifficultyMatrix().length === 0 && (
                     <p className="text-text-sub italic text-center py-10">Waiting for data signals...</p>
                   )}
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
