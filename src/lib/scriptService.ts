import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { OperationType } from '../types';
import { handleFirestoreError } from './errorUtils';

export interface Script {
  id: string;
  name: string;
  content: string;
  language: 'javascript' | 'python';
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function fetchUserScripts() {
  if (!auth.currentUser) return [];
  const scriptsPath = `users/${auth.currentUser.uid}/scripts`;
  try {
    const scriptsRef = collection(db, scriptsPath);
    const q = query(scriptsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Script));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, scriptsPath);
    return [];
  }
}

export async function saveScript(script: {
  id?: string;
  name: string;
  content: string;
  language: 'javascript' | 'python';
}) {
  if (!auth.currentUser) throw new Error('Must be signed in to save scripts');
  const scriptsPath = `users/${auth.currentUser.uid}/scripts`;

  try {
    if (script.id) {
      const scriptRef = doc(db, scriptsPath, script.id);
      await updateDoc(scriptRef, {
        name: script.name,
        content: script.content,
        language: script.language,
        updatedAt: serverTimestamp(),
      });
      return script.id;
    } else {
      const scriptsRef = collection(db, scriptsPath);
      const docRef = await addDoc(scriptsRef, {
        name: script.name,
        content: script.content,
        language: script.language,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    }
  } catch (error) {
    const path = script.id ? `${scriptsPath}/${script.id}` : scriptsPath;
    handleFirestoreError(error, script.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteScript(scriptId: string) {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/scripts/${scriptId}`;
  try {
    const scriptRef = doc(db, `users/${auth.currentUser.uid}/scripts`, scriptId);
    await deleteDoc(scriptRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
