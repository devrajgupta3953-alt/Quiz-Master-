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
  },

  async duplicateQuiz(quizId: string) {
    try {
      const quizSnap = await getDoc(doc(db, 'quizzes', quizId));
      if (!quizSnap.exists()) throw new Error('Quiz not found');
      const data = quizSnap.data();
      const docRef = await addDoc(collection(db, 'quizzes'), {
        ...data,
        title: `${data.title} (Copy)`,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'quizzes');
    }
  }
};

export const roomService = {
  async createRoom(adminId: string, quizId: string, playMode: Room['playMode'] = 'live') {
    try {
      // Generate code
      const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const docRef = await addDoc(collection(db, 'rooms'), {
        quizId,
        adminId,
        roomCode,
        status: playMode === 'live' ? 'lobby' : 'question',
        pacingMode: 'host-led',
        playMode,
        isLocked: false,
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
  },

  async kickParticipant(roomId: string, participantId: string) {
    try {
      await updateDoc(doc(db, `rooms/${roomId}/participants`, participantId), {
        isKicked: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}/participants/${participantId}`);
    }
  },

  async toggleLock(roomId: string, isLocked: boolean) {
    try {
      await updateDoc(doc(db, 'rooms', roomId), { isLocked });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  },

  async setPacingMode(roomId: string, pacingMode: Room['pacingMode']) {
    try {
      await updateDoc(doc(db, 'rooms', roomId), { pacingMode });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
    }
  }
};
