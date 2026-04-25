import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, Clock, Upload, Image as ImageIcon, Copy, X } from 'lucide-react';
import { quizService } from '../services/quizService';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionType } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export default function QuizEditor() {
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('quiz_draft');
    if (draft) {
      try {
        const { title: dTitle, questions: dQuestions } = JSON.parse(draft);
        setTitle(dTitle || '');
        setQuestions(dQuestions || []);
      } catch (e) {
        console.error('Failed to parse draft', e);
      }
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (title || questions.length > 0) {
      localStorage.setItem('quiz_draft', JSON.stringify({ title, questions }));
    }
  }, [title, questions]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'multiple-choice',
      text: '',
      options: ['', '', '', ''],
      correctOptionIndices: [0],
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
      updates.correctOptionIndices = [0];
      updates.correctText = undefined;
      updates.pairs = undefined;
    } else if (type === 'true-false') {
      updates.options = ['True', 'False'];
      updates.correctOptionIndices = [0];
      updates.correctText = undefined;
      updates.pairs = undefined;
    } else if (type === 'fill-in-blank') {
      updates.options = undefined;
      updates.correctOptionIndices = undefined;
      updates.correctText = '';
      updates.pairs = undefined;
    } else if (type === 'matching') {
      updates.options = undefined;
      updates.correctOptionIndices = undefined;
      updates.correctText = undefined;
      updates.pairs = [{ id: '1', key: '', value: '' }];
    }
    updateQuestion(index, updates);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split(/\r?\n/).filter(line => line.trim());
      
      const newQuestions: Question[] = lines.slice(1).map(line => {
        // More robust CSV parse using regex to respect quoted commas
        const parts: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i+1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

        const [text, o1, o2, o3, o4, correct, time, type] = parts;
        
        const qType: QuestionType = (type?.toLowerCase() as QuestionType) || 'multiple-choice';
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          type: qType,
          text: text || 'Imported Question',
          options: qType === 'multiple-choice' ? [o1, o2, o3, o4].filter(Boolean) : (qType === 'true-false' ? ['True', 'False'] : undefined),
          correctOptionIndices: correct ? correct.split('|').map(c => parseInt(c.trim()) || 0) : [0],
          timeLimit: parseInt(time) || 15
        } as Question;
      });
      setQuestions([...questions, ...newQuestions]);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!title) return alert('Please enter a title');
    if (questions.length === 0) return alert('Please add at least one question');
    
    // Clear draft on successful save
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
      localStorage.removeItem('quiz_draft');
      navigate('/admin');
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap gap-4 justify-between items-center bg-surface p-4 rounded-xl border border-border sticky top-6 z-10 shadow-sm">
          <div className="flex items-center gap-4 flex-1 min-w-[200px]">
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
              className="bg-transparent border-none text-2xl font-bold focus:ring-0 placeholder:text-text-sub/30 w-full"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleCsvImport}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-bold bg-bg border border-border rounded-lg hover:border-brand transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              BULK IMPORT
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="quizlet-btn-primary"
            >
              {isSaving ? 'SAVING...' : 'DONE'}
            </button>
          </div>
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
                <div className="flex items-center gap-2">
                   <button
                    onClick={() => {
                      const newQ = { ...q, id: Math.random().toString(36).substr(2, 9) };
                      const newQs = [...questions];
                      newQs.splice(qIndex + 1, 0, newQ);
                      setQuestions(newQs);
                    }}
                    className="p-2 text-text-sub hover:text-brand transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeQuestion(qIndex)}
                    className="p-2 text-text-sub hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Term / Question</label>
                    <textarea
                      placeholder={q.type === 'matching' ? "Enter instructions for matching" : "Enter question"}
                      value={q.text}
                      onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                      className="w-full bg-transparent border-b-2 border-text-main/10 focus:border-brand p-2 text-xl font-medium focus:outline-none transition-all resize-none min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-text-sub flex items-center gap-2">
                      <ImageIcon className="w-3 h-3" />
                      Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.png"
                      value={q.imageUrl || ''}
                      onChange={(e) => updateQuestion(qIndex, { imageUrl: e.target.value })}
                      className="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:border-brand focus:outline-none"
                    />
                    {q.imageUrl && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border mt-2">
                        <img src={q.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => updateQuestion(qIndex, { imageUrl: '' })}
                          className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Question Type Specific Fields */}
                  {q.type === 'multiple-choice' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Options (Select Correct)</label>
                        <button onClick={() => {
                          if (q.options) {
                            updateQuestion(qIndex, { options: [...q.options, ''] });
                          }
                        }} className="text-[10px] font-black text-brand hover:underline">+ ADD OPTION</button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {q.options?.map((option, oIndex) => (
                          <div
                            key={oIndex}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-all",
                              q.correctOptionIndices?.includes(oIndex)
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-border hover:border-brand"
                            )}
                          >
                            <button
                              onClick={() => {
                                if (q.correctOptionIndices) {
                                  const isSelected = q.correctOptionIndices.includes(oIndex);
                                  let newIndices: number[];
                                  if (isSelected) {
                                    if (q.correctOptionIndices.length === 1) return;
                                    newIndices = q.correctOptionIndices.filter(i => i !== oIndex);
                                  } else {
                                    newIndices = [...q.correctOptionIndices, oIndex];
                                  }
                                  updateQuestion(qIndex, { correctOptionIndices: newIndices });
                                }
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                q.correctOptionIndices?.includes(oIndex)
                                  ? "bg-emerald-500 border-emerald-500 shadow-sm"
                                  : "border-border"
                              )}
                            >
                              {q.correctOptionIndices?.includes(oIndex) && <div className="w-2 h-2 bg-white rounded-full" />}
                            </button>
                            <input
                              type="text"
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...q.options!];
                                newOptions[oIndex] = e.target.value;
                                updateQuestion(qIndex, { options: newOptions });
                              }}
                              className="bg-transparent border-none w-full focus:ring-0 text-base font-medium"
                            />
                             {q.options!.length > 2 && (
                              <button onClick={() => {
                                const newOptions = q.options!.filter((_, i) => i !== oIndex);
                                const newCorrectIndices = (q.correctOptionIndices || [])
                                  .filter(i => i !== oIndex)
                                  .map(i => i > oIndex ? i - 1 : i);
                                updateQuestion(qIndex, { 
                                  options: newOptions,
                                  correctOptionIndices: newCorrectIndices.length > 0 ? newCorrectIndices : [0]
                                });
                              }} className="text-text-sub hover:text-red-500">
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
                            onClick={() => updateQuestion(qIndex, { correctOptionIndices: [i] })}
                            className={cn(
                              "p-6 rounded-xl border-2 font-bold transition-all",
                              q.correctOptionIndices?.includes(i)
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-widest text-text-sub">Pairs to Match</label>
                        <button onClick={() => {
                          updateQuestion(qIndex, { 
                            pairs: [...(q.pairs||[]), { id: Math.random().toString(36).substr(2, 5), key: '', value: '' }] 
                          });
                        }} className="text-[10px] font-black text-brand hover:underline">+ ADD PAIR</button>
                      </div>
                      <div className="space-y-3">
                        {q.pairs?.map((pair, pIndex) => (
                          <div key={pair.id} className="flex gap-2 items-center">
                            <input
                              placeholder="Key"
                              value={pair.key}
                              onChange={(e) => {
                                const newPairs = [...q.pairs!];
                                newPairs[pIndex].key = e.target.value;
                                updateQuestion(qIndex, { pairs: newPairs });
                              }}
                              className="flex-1 min-w-0 bg-bg border border-border rounded-lg p-2 text-sm focus:border-brand focus:outline-none"
                            />
                            <input
                              placeholder="Value"
                              value={pair.value}
                              onChange={(e) => {
                                const newPairs = [...q.pairs!];
                                newPairs[pIndex].value = e.target.value;
                                updateQuestion(qIndex, { pairs: newPairs });
                              }}
                              className="flex-1 min-w-0 bg-bg border border-border rounded-lg p-2 text-sm focus:border-brand focus:outline-none"
                            />
                            {q.pairs!.length > 1 && (
                              <button onClick={() => {
                                updateQuestion(qIndex, { pairs: q.pairs!.filter((_, i) => i !== pIndex) });
                              }} className="text-text-sub hover:text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                    onChange={(e) => updateQuestion(qIndex, { timeLimit: parseInt(e.target.value) || 15 })}
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
