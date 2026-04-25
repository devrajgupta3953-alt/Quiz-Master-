import { collection, addDoc, query, onSnapshot, updateDoc, doc, serverTimestamp, setDoc, getDoc, getDocs } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Participant, Response } from '../types';

export const participantService = {
  async joinRoom(roomId: string, userId: string, nickname: string) {
    try {
      await setDoc(doc(db, `rooms/${roomId}/participants`, userId), {
        nickname,
        score: 0,
        isKicked: false,
        joinedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}/participants`);
    }
  },

  async submitResponse(roomId: string, response: Omit<Response, 'id' | 'answeredAt'>) {
    try {
      await addDoc(collection(db, `rooms/${roomId}/responses`), {
        ...response,
        answeredAt: serverTimestamp(),
      });

      // If correct, update score (Note: In production this should be server-side or more secured)
      if (response.isCorrect) {
        const participantRef = doc(db, `rooms/${roomId}/participants`, response.participantId);
        const snap = await getDoc(participantRef);
        if (snap.exists()) {
          await updateDoc(participantRef, {
            score: (snap.data().score || 0) + response.points
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}/responses`);
    }
  },

  onParticipantsChange(roomId: string, callback: (participants: Participant[]) => void) {
    const q = query(collection(db, `rooms/${roomId}/participants`));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Participant)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/participants`);
    });
  },

  onResponsesChange(roomId: string, callback: (responses: Response[]) => void) {
    const q = query(collection(db, `rooms/${roomId}/responses`));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Response)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${roomId}/responses`);
    });
  }
};
