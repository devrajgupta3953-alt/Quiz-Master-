import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Clock, CheckCircle2, XCircle, Zap, Loader2, User } from 'lucide-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { participantService } from '../services/participantService';
import { useAuth } from '../context/AuthContext';
import { Room, Quiz, Participant } from '../types';
import { cn } from '../lib/utils';

export default function ParticipantRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [me, setMe] = useState<Participant | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean, points: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userQuestionIndex, setUserQuestionIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // States for complex question types
  const [fillValue, setFillValue] = useState('');
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({});
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [shuffledMatchData, setShuffledMatchData] = useState<{keys: any[], values: any[]} | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    if (!roomId || !user) return;

    // Listen to Room
    const unsubscribeRoom = onSnapshot(doc(db, 'rooms', roomId), async (snapshot) => {
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
        navigate('/');
      }
    });

    // Listen to Me
    const unsubscribeMe = onSnapshot(doc(db, `rooms/${roomId}/participants`, user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setMe({ id: snapshot.id, ...snapshot.data() } as Participant);
      }
    });

    return () => {
      unsubscribeRoom();
      unsubscribeMe();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId, user, quiz]);

  // Handle Timer and state resets when question changes
  useEffect(() => {
    const currentIndex = room?.playMode === 'self-paced' ? userQuestionIndex : (room?.currentQuestionIndex ?? 0);
    const activeStatus = room?.playMode === 'self-paced' ? 'question' : room?.status;

    if (activeStatus === 'question' && quiz) {
      setHasAnswered(false);
      setLastResult(null);
      setFillValue('');
      setMatchingPairs({});
      setSelectedIndices([]);
      setSelectedKey(null);

      const currentQuestion = quiz.questions[currentIndex];
      if (!currentQuestion) return;

      if (currentQuestion.type === 'matching' && currentQuestion.pairs) {
        const keys = [...currentQuestion.pairs].sort(() => Math.random() - 0.5);
        const values = [...currentQuestion.pairs].map(p => p.value).sort(() => Math.random() - 0.5);
        setShuffledMatchData({ keys, values });
      }

      if (room?.playMode === 'live') {
        const startTime = room.questionStartTime?.toDate().getTime() || Date.now();
        const duration = currentQuestion.timeLimit * 1000;

        const updateTimer = () => {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((startTime + duration - now) / 1000));
          setTimeLeft(remaining);

          if (remaining <= 0 && timerRef.current) {
            clearInterval(timerRef.current);
            setHasAnswered(true);
          }
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);
      } else {
        // Self-paced gets full time or infinite? Let's give them the time limit but it starts from now
        setTimeLeft(currentQuestion.timeLimit);
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setHasAnswered(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  }, [room?.currentQuestionIndex, room?.status, userQuestionIndex]);

  const currentIndex = room?.playMode === 'self-paced' ? userQuestionIndex : (room?.currentQuestionIndex ?? 0);

  const toggleOptionSelection = (index: number) => {
    if (hasAnswered) return;
    setSelectedIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleAnswerMultipleChoice = async () => {
    if (hasAnswered || !room || !quiz || !user || selectedIndices.length === 0) return;
    
    const currentQuestion = quiz.questions[currentIndex];
    const correctIndices = currentQuestion.correctOptionIndices || [];
    
    const isCorrect = selectedIndices.length === correctIndices.length && 
                      selectedIndices.every(idx => correctIndices.includes(idx));
                      
    submit(isCorrect, { answerIndices: selectedIndices });
  };

  const handleAnswerFillInBlank = async () => {
    if (hasAnswered || !room || !quiz || !user || !fillValue) return;
    const currentQuestion = quiz.questions[currentIndex];
    const isCorrect = fillValue.trim().toLowerCase() === currentQuestion.correctText?.toLowerCase();
    submit(isCorrect, { answerText: fillValue });
  };

  const handleAnswerMatching = async () => {
    if (hasAnswered || !room || !quiz || !user) return;
    const currentQuestion = quiz.questions[currentIndex];
    
    let isCorrect = true;
    const pairs = currentQuestion.pairs || [];
    if (Object.keys(matchingPairs).length < pairs.length) {
      isCorrect = false;
    } else {
      for (const pair of pairs) {
        if (matchingPairs[pair.key] !== pair.value) {
          isCorrect = false;
          break;
        }
      }
    }
    
    submit(isCorrect, { matchingAnswers: matchingPairs });
  };

  const toggleMatch = (key: string, value: string) => {
    setMatchingPairs(prev => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setSelectedKey(null);
  };

  const submit = async (isCorrect: boolean, extra: Partial<Response>) => {
    const currentQuestion = quiz.questions[currentIndex];
    const factor = timeLeft / currentQuestion.timeLimit;
    const points = isCorrect ? Math.round(1000 * factor) : 0;

    setHasAnswered(true);
    setLastResult({ isCorrect, points });

    await participantService.submitResponse(room.id, {
      participantId: user.uid,
      questionIndex: currentIndex,
      isCorrect,
      points,
      ...extra
    } as any);

    if (room.playMode === 'self-paced') {
       // Auto-advance or wait for user? Let's show results for 2 seconds then advance
       setTimeout(() => {
         if (userQuestionIndex + 1 < quiz.questions.length) {
           setUserQuestionIndex(prev => prev + 1);
         } else {
           setIsFinished(true);
         }
       }, 2000);
    }
  };

  if (!room || !quiz || !me) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
  );

  if (me.isKicked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-[2.5rem] border border-border text-center space-y-8 max-w-md shadow-2xl"
        >
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight">Kicked from Session</h1>
            <p className="text-text-sub font-bold leading-relaxed">The host has removed you from this session. Please contact the host if you believe this is an error.</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="quizlet-btn-secondary w-full"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-main flex flex-col p-6 overflow-hidden">
      {/* Header Info */}
      <header className="flex justify-between items-center bg-white p-6 rounded-2xl border border-border mb-8 max-w-2xl mx-auto w-full shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand/5 rounded-full flex items-center justify-center border border-brand/10">
            <User className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-text-sub tracking-widest leading-none">Player</span>
            <span className="text-base font-bold">{me.nickname}</span>
          </div>
        </div>
        
        {((room.playMode === 'live' && room.status === 'question') || (room.playMode === 'self-paced' && !isFinished)) && (
          <div className={"flex flex-col items-center"}>
            <span className="text-[10px] font-black uppercase text-text-sub tracking-widest leading-none mb-1">Time</span>
            <div className={cn("text-2xl font-mono font-black", timeLeft < 5 ? "text-red-500 animate-pulse" : "text-text-main")}>
              {timeLeft}
            </div>
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black uppercase text-text-sub tracking-widest leading-none">Score</span>
          <span className="text-2xl font-mono font-black text-brand italic">{me.score}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {room.status === 'lobby' && room.playMode === 'live' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-12"
            >
              <div className="relative inline-block p-12 rounded-[2.5rem] bg-white border border-border shadow-2xl">
                <Zap className="w-20 h-20 text-brand mx-auto animate-pulse" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute inset-0 bg-brand/20 blur-[80px] -z-10 rounded-full" 
                />
              </div>
              <div className="space-y-4">
                <h1 className="text-5xl font-black tracking-tight">You're in!</h1>
                <p className="text-text-sub text-xl font-bold uppercase tracking-widest">Waiting for host to start</p>
                <div className="flex items-center gap-2 justify-center mt-8 text-brand font-bold bg-white w-fit mx-auto px-6 py-2 rounded-full border border-border shadow-sm">
                   <div className="w-2 h-2 bg-brand rounded-full animate-ping" />
                   {room.participantCount || 0} Players waiting
                </div>
              </div>
            </motion.div>
          )}

          {((room.playMode === 'self-paced' && !isFinished) || (room.playMode === 'live' && room.status === 'question')) && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 w-full"
            >
              <div className="space-y-4 text-center">
                <div className="flex justify-center gap-3">
                   <span className="bg-bg text-text-sub border border-border px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">Question {currentIndex + 1}</span>
                   <span className={cn(
                     "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest",
                     room.playMode === 'live' ? "bg-brand text-white animate-pulse" : "bg-bg text-text-sub border border-border"
                   )}>
                     {room.playMode === 'live' ? 'Live' : 'Self-Paced'}
                   </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight leading-tight px-4">
                  {quiz.questions[currentIndex].text}
                </h2>
                
                {quiz.questions[currentIndex].imageUrl && (
                  <div className="max-w-md mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                    <img 
                      src={quiz.questions[currentIndex].imageUrl} 
                      alt="Question" 
                      className="w-full h-auto max-h-[250px] object-contain bg-black"
                    />
                  </div>
                )}
              </div>

              {!hasAnswered ? (
                <div className="space-y-6 px-2">
                  {(quiz.questions[currentIndex].type === 'multiple-choice' || quiz.questions[currentIndex].type === 'true-false') && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4">
                        {quiz.questions[currentIndex].options?.map((opt, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleOptionSelection(i)}
                            className={cn(
                              "p-6 rounded-2xl border-4 bg-white text-left text-lg font-bold flex items-center justify-between group shadow-sm hover:shadow-lg transition-all",
                              selectedIndices.includes(i) ? "border-brand" : "border-transparent hover:border-brand/20"
                            )}
                          >
                            <div className="flex items-center gap-6">
                              <span className={cn(
                                "w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black transition-colors",
                                selectedIndices.includes(i) ? "bg-brand text-white border-brand" : "bg-bg border-border group-hover:bg-brand group-hover:text-white"
                              )}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="text-xl font-bold text-text-main">{opt}</span>
                            </div>
                            {selectedIndices.includes(i) && (
                              <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full" />
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>
                      <button
                        onClick={handleAnswerMultipleChoice}
                        disabled={selectedIndices.length === 0}
                        className="quizlet-btn-primary w-full py-6 text-xl shadow-lg"
                      >
                        CONFIRM CHOICE{selectedIndices.length > 1 ? 'S' : ''}
                      </button>
                    </div>
                  )}

                  {quiz.questions[currentIndex].type === 'fill-in-blank' && (
                    <div className="space-y-6">
                      <input
                        type="text"
                        placeholder="Type your answer here..."
                        autoFocus
                        value={fillValue}
                        onChange={(e) => setFillValue(e.target.value)}
                        className="w-full bg-white border-2 border-border rounded-2xl p-6 text-2xl font-bold focus:border-brand focus:outline-none transition-all shadow-sm"
                      />
                      <button
                        onClick={handleAnswerFillInBlank}
                        disabled={!fillValue.trim()}
                        className="quizlet-btn-primary w-full py-6 text-xl shadow-lg"
                      >
                        SUBMIT ANSWER
                      </button>
                    </div>
                  )}

                  {quiz.questions[currentIndex].type === 'matching' && shuffledMatchData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-text-sub tracking-widest text-center block">Terms</label>
                          {shuffledMatchData.keys.map((pair) => (
                            <button
                              key={pair.id}
                              onClick={() => setSelectedKey(pair.key)}
                              className={cn(
                                "w-full p-4 rounded-xl border-2 text-sm font-bold transition-all text-center h-20 flex items-center justify-center",
                                selectedKey === pair.key ? "border-brand bg-brand/5 shadow-inner" : "border-border bg-white shadow-sm",
                                matchingPairs[pair.key] ? "opacity-30 pointer-events-none grayscale" : ""
                              )}
                            >
                              {pair.key}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-text-sub tracking-widest text-center block">Definitions</label>
                          {shuffledMatchData.values.map((val, idx) => (
                            <button
                              key={idx}
                              disabled={!selectedKey}
                              onClick={() => selectedKey && toggleMatch(selectedKey, val)}
                              className={cn(
                                "w-full p-4 rounded-xl border-2 text-sm font-bold transition-all text-center h-20 flex items-center justify-center",
                                !selectedKey ? "border-border bg-bg opacity-50" : "border-border bg-white hover:border-brand shadow-sm",
                                Object.values(matchingPairs).includes(val) ? "opacity-30 pointer-events-none grayscale" : ""
                              )}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display current matches */}
                      {Object.keys(matchingPairs).length > 0 && (
                        <div className="bg-surface p-4 rounded-xl border border-border space-y-2">
                           <span className="text-[10px] font-black uppercase text-text-sub tracking-widest">Matched Pairs:</span>
                           <div className="flex flex-wrap gap-2">
                             {Object.entries(matchingPairs).map(([k, v]) => (
                               <div key={k} className="bg-bg px-3 py-1 rounded-full border border-border text-[10px] font-bold flex items-center gap-2">
                                 {k} ➔ {v}
                                 <button onClick={() => toggleMatch(k, v)} className="text-red-500 hover:scale-125 transition-transform">×</button>
                               </div>
                             ))}
                           </div>
                        </div>
                      )}

                      <button
                        onClick={handleAnswerMatching}
                        disabled={Object.keys(matchingPairs).length < (quiz.questions[currentIndex].pairs?.length || 0)}
                        className="quizlet-btn-primary w-full py-6 text-xl shadow-lg"
                      >
                        CONFIRM MATCHES
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-12 rounded-[2.5rem] border border-border text-center space-y-6 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-brand animate-pulse" />
                  <div className="flex flex-col items-center gap-6">
                    <div className={cn(
                      "w-20 h-20 rounded-full flex items-center justify-center border-4",
                      lastResult?.isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                    )}>
                      {lastResult?.isCorrect ? <CheckCircle2 className="w-10 h-10 text-emerald-500" /> : <XCircle className="w-10 h-10 text-red-500" />}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight">
                        {lastResult?.isCorrect ? 'Correct!' : 'Incorrect'}
                      </h3>
                      {lastResult?.isCorrect && <p className="text-emerald-500 font-black">+{lastResult.points} POINTS</p>}
                      <p className="text-text-sub font-bold uppercase tracking-[0.2em] text-sm">
                        {room.playMode === 'self-paced' ? 'Getting next question...' : 'Stay ready for the results'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {(room.status === 'leaderboard' && room.playMode === 'live') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-12"
            >
              {lastResult ? (
                <div className="space-y-8 px-4">
                  {lastResult.isCorrect ? (
                    <>
                      <div className="relative inline-block p-12 rounded-[3rem] bg-white border-4 border-emerald-500 shadow-2xl">
                        <CheckCircle2 className="w-32 h-32 text-emerald-500 mx-auto" />
                      </div>
                      <div className="space-y-2">
                        <h1 className="text-5xl font-black tracking-tight text-emerald-600">Spot on!</h1>
                        <p className="text-emerald-500/60 text-2xl font-mono font-black">+{lastResult.points} POINTS</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative inline-block p-12 rounded-[3rem] bg-white border-4 border-red-500 shadow-2xl">
                        <XCircle className="w-32 h-32 text-red-500 mx-auto" />
                      </div>
                      <div className="space-y-4">
                        <h1 className="text-5xl font-black tracking-tight text-red-600">Close call!</h1>
                        <p className="text-text-sub font-bold uppercase tracking-widest">Focus on the next one</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                   <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto border-2 border-border border-dashed animate-spin-slow">
                    <Trophy className="w-12 h-12 text-text-sub/20" />
                   </div>
                   <p className="text-text-sub text-lg font-bold uppercase tracking-widest italic px-8">Calculating global standings...</p>
                </div>
              )}
            </motion.div>
          )}

          {(room.status === 'finished' || isFinished) && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-12"
             >
                <div className="relative inline-block">
                  <Trophy className="w-32 h-32 text-yellow-500 mx-auto" />
                  <motion.div
                   animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1] }}
                   transition={{ repeat: Infinity, duration: 4 }}
                   className="absolute inset-0 bg-yellow-400/30 blur-[100px] -z-10"
                  />
                </div>
                <div className="space-y-6">
                  <h1 className="text-6xl font-black tracking-tight">{isFinished ? 'Set Complete!' : 'Final Result'}</h1>
                  <div className="bg-white p-12 rounded-[3rem] border border-border max-w-sm mx-auto shadow-2xl">
                      <span className="text-text-sub font-black uppercase tracking-[0.4em] text-xs block mb-4">Total Score</span>
                      <div className="text-7xl font-mono font-black italic text-brand">{me.score}</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="quizlet-btn-secondary"
                >
                  Exit {isFinished ? 'Practice' : 'Session'}
                </button>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
