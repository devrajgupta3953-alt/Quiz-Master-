import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Quiz, Room, Question } from '../types';

export const quizService = {
  async createQuiz(creatorId: string, title: string, questions: Question[]) {
    try {
      const docRef = await addDoc(collection(db, 'quizzes'), {
        title,
        creatorId,
        questions,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
    }
  },

  async getAdminQuizzes(adminId: string) {
    try {
      const q = query(collection(db, 'quizzes'), where('creatorId', '==', adminId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quiz));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'quizzes');
    }
  },

  async deleteQuiz(quizId: string) {
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `quizzes/${quizId}`);
    }
  }
};

export const roomService = {
  async createRoom(adminId: string, quizId: string) {
    try {
      // Generate code
      const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const docRef = await addDoc(collection(db, 'rooms'), {
        quizId,
        adminId,
        roomCode,
        status: 'lobby',
        currentQuestionIndex: 0,
        questionStartTime: null,
        participantCount: 0,
        createdAt: serverTimestamp(),
      });
      return { id: docRef.id, roomCode };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rooms');
    }
  },

  async getRoomByCode(code: string) {
    try {
      const q = query(collection(db, 'rooms'), where('roomCode', '==', code), where('status', '!=', 'finished'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Room;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'rooms');
    }
  },

  async updateRoomStatus(roomId: string, status: Room['status'], extra = {}) {
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        status,
        ...extra
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }
};
