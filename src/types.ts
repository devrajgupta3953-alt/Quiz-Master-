export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-in-blank' | 'matching';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctOptionIndex?: number;
  correctText?: string;
  pairs?: { id: string; key: string; value: string }[];
  timeLimit: number;
}

export interface Quiz {
  id: string;
  title: string;
  creatorId: string;
  questions: Question[];
  createdAt: any;
}

export type RoomStatus = 'lobby' | 'question' | 'feedback' | 'leaderboard' | 'finished';

export interface Room {
  id: string;
  quizId: string;
  adminId: string;
  roomCode: string;
  status: RoomStatus;
  currentQuestionIndex: number;
  questionStartTime: any;
  participantCount: number;
  createdAt: any;
}

export interface Participant {
  id: string;
  nickname: string;
  score: number;
  joinedAt: any;
}

export interface Response {
  id: string;
  participantId: string;
  questionIndex: number;
  answerIndex?: number;
  answerText?: string;
  matchingAnswers?: Record<string, string>;
  isCorrect: boolean;
  points: number;
  answeredAt: any;
}
