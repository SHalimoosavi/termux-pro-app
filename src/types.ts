import { Timestamp } from 'firebase/firestore';

export type ModuleCategory = 'development' | 'web' | 'automation' | 'cybersecurity' | 'ai';

export interface Module {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  authorId: string;
  authorName: string;
  downloadUrl: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  downloadCount: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  installedModules: string[];
  xp: number;
  level: number;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
