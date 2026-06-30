import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Standard Firebase configuration loaded from the auto-provisioned file.
const firebaseConfig = {
  apiKey: "AIzaSyAVXXs7Sd5ZXPCnokc78oShf_gxl8VX_Jg",
  authDomain: "ancient-hope-9pdf2.firebaseapp.com",
  projectId: "ancient-hope-9pdf2",
  storageBucket: "ancient-hope-9pdf2.firebasestorage.app",
  messagingSenderId: "274926893039",
  appId: "1:274926893039:web:92c8242738702d7b19e81a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable robust, multi-tab local cache for seamless offline storage & instant loading on refresh
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "ai-studio-6bbdfdd6-2434-42d0-b8c7-cabfc91f670a");

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Non-Fatal Error (retaining local state): ', JSON.stringify(errInfo));
  // DO NOT throw a fatal exception here, as it would crash the React render tree
  // and result in a blank white page of death when offline or during transient connection drops.
}

export default app;
