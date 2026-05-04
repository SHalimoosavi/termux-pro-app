import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  increment, 
  updateDoc, 
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Module, ModuleCategory, OperationType } from '../types';
import { handleFirestoreError } from './errorUtils';

const MODULES_PATH = 'modules';

export async function fetchModules(category?: string) {
  try {
    const modulesRef = collection(db, MODULES_PATH);
    let q;
    
    if (category && category !== 'all') {
      q = query(modulesRef, where('category', '==', category), orderBy('createdAt', 'desc'));
    } else {
      q = query(modulesRef, orderBy('createdAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MODULES_PATH);
    return [];
  }
}

export async function uploadModule(moduleData: {
  name: string;
  description: string;
  category: ModuleCategory;
  downloadUrl: string;
}) {
  if (!auth.currentUser) throw new Error('Must be signed in to upload');

  try {
    const modulesRef = collection(db, MODULES_PATH);
    const newModule = {
      ...moduleData,
      authorId: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || 'Anonymous',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      downloadCount: 0,
    };
    
    const docRef = await addDoc(modulesRef, newModule);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, MODULES_PATH);
  }
}

export async function recordDownload(moduleId: string) {
  const path = `${MODULES_PATH}/${moduleId}`;
  try {
    const moduleRef = doc(db, MODULES_PATH, moduleId);
    await updateDoc(moduleRef, {
      downloadCount: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
