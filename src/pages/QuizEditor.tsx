import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, Clock } from 'lucide-react';
import { quizService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { cn } from '../lib/utils';
import { motion, Reorder } from 'motion/react';

export default function QuizEditor() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'multiple-choice',
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      timeLimit: 15
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const updateQuestionType = (index: number, type: QuestionType) => {
    const updates: Partial<Question> = { type };
    if (type === 'multiple-choice') {
      updates.options = ['', '', '', ''];
      updates.correctOptionIndex = 0;
      updates.correctText = undefined;
      updates.pairs = undefined;
    } else if (type === 'true-false') {
      updates.options = ['True', 'False'];
      updates.correctOptionIndex = 0;
      updates.correctText = undefined;
      updates.pairs = undefined;
    } else if (type === 'fill-in-blank') {
      updates.options = undefined;
      updates.correctOptionIndex = undefined;
      updates.correctText = '';
      updates.pairs = undefined;
    } else if (type === 'matching') {
      updates.options = undefined;
      updates.correctOptionIndex = undefined;
      updates.correctText = undefined;
      updates.pairs = [{ id: '1', key: '', value: '' }];
    }
    updateQuestion(index, updates);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options) {
      newQuestions[qIndex].options![oIndex] = text;
      setQuestions(newQuestions);
    }
  };

  const addOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options) {
      updateQuestion(qIndex, { options: [...q.options, ''] });
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const q = questions[qIndex];
    if (q.options && q.options.length > 2) {
      const newOptions = q.options.filter((_, i) => i !== oIndex);
      const updates: Partial<Question> = { options: newOptions };
      if (q.correctOptionIndex === oIndex) updates.correctOptionIndex = 0;
      else if (q.correctOptionIndex! > oIndex) updates.correctOptionIndex = q.correctOptionIndex! - 1;
      updateQuestion(qIndex, updates);
    }
  };

  const addPair = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.pairs) {
      updateQuestion(qIndex, { 
        pairs: [...q.pairs, { id: Math.random().toString(36).substr(2, 5), key: '', value: '' }] 
      });
    }
  };

  const updatePair = (qIndex: number, pIndex: number, field: 'key' | 'value', text: string) => {
    const q = questions[qIndex];
    if (q.pairs) {
      const newPairs = [...q.pairs];
      newPairs[pIndex][field] = text;
      updateQuestion(qIndex, { pairs: newPairs });
    }
  };

  const removePair = (qIndex: number, pIndex: number) => {
    const q = questions[qIndex];
    if (q.pairs && q.pairs.length > 1) {
      updateQuestion(qIndex, { pairs: q.pairs.filter((_, i) => i !== pIndex) });
    }
  };

  const handleSave = async () => {
    if (!title) return alert('Please enter a title');
    if (questions.length === 0) return alert('Please add at least one question');
    
    const isValid = questions.every(q => {
      if (!q.text) return false;
      if (q.type === 'multiple-choice' || q.type === 'true-false') {
        return q.options && q.options.every(o => o.trim() !== '');
      }
      if (q.type === 'fill-in-blank') {
        return q.correctText && q.correctText.trim() !== '';
      }
      if (q.type === 'matching') {
        return q.pairs && q.pairs.every(p => p.key.trim() !== '' && p.value.trim() !== '');
      }
      return true;
    });

    if (!isValid) return alert('Please fill in all fields for all questions');

    setIsSaving(true);
    try {
      await quizService.createQuiz(user!.uid, title, questions);
      navigate('/admin');
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-surface p-4 rounded-xl border border-border sticky top-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-bg rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input
              type="text"
              placeholder="Enter title (e.g. Biology Quiz)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none text-2xl font-bold focus:ring-0 placeholder:text-text-sub/30"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="quizlet-btn-primary"
          >
            {isSaving ? 'SAVING...' : 'DONE'}
          </button>
        </header>

        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface p-8 rounded-xl border border-border space-y-8 shadow-sm relative group"
            >
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold tracking-widest text-text-sub uppercase">
                    {qIndex + 1}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestionType(qIndex, e.target.value as QuestionType)}
                    className="bg-bg border border-border rounded-lg px-3 py-1 text-xs font-bold focus:outline-none focus:border-brand"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="true-false">True / False</option>
                    <option value="fill-in-blank">Fill in the Blank</option>
                    <option value="matching">Matching</option>
                  </select>
                </div>
                <button
                  onClick={() => removeQuestion(qIndex)}
                  className="p-2 text-text-sub hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className={cn("grid grid-cols-1 gap-8", q.type === 'matching' ? "" : "md:grid-cols-2")}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Term / Question</label>
                  <textarea
                    placeholder={q.type === 'matching' ? "Enter instructions for matching" : "Enter question"}
                    value={q.text}
                    onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                    className="w-full bg-transparent border-b-2 border-text-main/10 focus:border-brand p-2 text-xl font-medium focus:outline-none transition-all resize-none min-h-[100px]"
                  />
                </div>
                
                {q.type === 'multiple-choice' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Options (Select Correct)</label>
                      <button onClick={() => addOption(qIndex)} className="text-[10px] font-black text-brand hover:underline">+ ADD OPTION</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {q.options?.map((option, oIndex) => (
                        <div
                          key={oIndex}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all",
                            q.correctOptionIndex === oIndex
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-border hover:border-brand"
                          )}
                        >
                          <button
                            onClick={() => updateQuestion(qIndex, { correctOptionIndex: oIndex })}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                              q.correctOptionIndex === oIndex
                                ? "bg-emerald-500 border-emerald-500 shadow-sm"
                                : "border-border"
                            )}
                          >
                            {q.correctOptionIndex === oIndex && <div className="w-2 h-2 bg-white rounded-full" />}
                          </button>
                          <input
                            type="text"
                            placeholder={`Option ${oIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            className="bg-transparent border-none w-full focus:ring-0 text-base font-medium"
                          />
                          {q.options!.length > 2 && (
                            <button onClick={() => removeOption(qIndex, oIndex)} className="text-text-sub hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'true-false' && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Select Truth</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['True', 'False'].map((val, i) => (
                        <button
                          key={val}
                          onClick={() => updateQuestion(qIndex, { correctOptionIndex: i })}
                          className={cn(
                            "p-6 rounded-xl border-2 font-bold transition-all",
                            q.correctOptionIndex === i
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-border hover:border-brand"
                          )}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'fill-in-blank' && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Correct Answer</label>
                    <input
                      type="text"
                      placeholder="Enter exactly what they should type"
                      value={q.correctText}
                      onChange={(e) => updateQuestion(qIndex, { correctText: e.target.value })}
                      className="w-full bg-bg border-2 border-border rounded-xl p-4 text-lg font-bold focus:border-brand focus:outline-none transition-all"
                    />
                  </div>
                )}

                {q.type === 'matching' && (
                  <div className="space-y-4 mt-8">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Pairs to Match</label>
                      <button onClick={() => addPair(qIndex)} className="text-[10px] font-black text-brand hover:underline">+ ADD PAIR</button>
                    </div>
                    <div className="space-y-3">
                      {q.pairs?.map((pair, pIndex) => (
                        <div key={pair.id} className="flex gap-4 items-center">
                          <input
                            placeholder="Key (e.g. Paris)"
                            value={pair.key}
                            onChange={(e) => updatePair(qIndex, pIndex, 'key', e.target.value)}
                            className="flex-1 bg-bg border border-border rounded-lg p-3 text-sm font-medium focus:border-brand focus:outline-none"
                          />
                          <span className="text-text-sub font-mono">→</span>
                          <input
                            placeholder="Value (e.g. France)"
                            value={pair.value}
                            onChange={(e) => updatePair(qIndex, pIndex, 'value', e.target.value)}
                            className="flex-1 bg-bg border border-border rounded-lg p-3 text-sm font-medium focus:border-brand focus:outline-none"
                          />
                          {q.pairs!.length > 1 && (
                            <button onClick={() => removePair(qIndex, pIndex)} className="text-text-sub hover:text-red-500 p-2">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                <Clock className="w-4 h-4 text-text-sub" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text-sub">Limit:</span>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={q.timeLimit}
                    onChange={(e) => updateQuestion(qIndex, { timeLimit: parseInt(e.target.value) || 0 })}
                    className="w-20 bg-bg border border-border rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:border-brand"
                  />
                  <span className="text-xs font-bold text-text-sub">seconds</span>
                </div>
              </div>
            </motion.div>
          ))}

          <button
            onClick={addQuestion}
            className="w-full py-8 border-4 border-dashed border-border rounded-xl text-text-sub hover:text-brand hover:border-brand/40 hover:bg-white transition-all flex flex-col items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-full border-2 border-border group-hover:border-brand flex items-center justify-center">
               <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest">Add Card</span>
          </button>
        </div>
      </div>
    </div>
  );
}
