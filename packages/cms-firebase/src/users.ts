import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { getFirebaseServices } from "./config";

const USERS_COLLECTION = "__cms_users";

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams {
  limit?: number;
  offset?: number;
}

export interface FirestoreUsersProvider {
  listUsers(params?: ListUsersParams): Promise<{ data: User[]; total: number }>;
  getUser(id: string): Promise<User | null>;
  createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

function mapUserDoc(doc: QueryDocumentSnapshot<DocumentData>): User {
  return { id: doc.id, ...doc.data() } as User;
}

export function createFirestoreUsersProvider(): FirestoreUsersProvider {
  return {
    async createUser(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
      const { db } = getFirebaseServices();
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, USERS_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });

      return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
    },

    async deleteUser(id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, USERS_COLLECTION, id));
    },

    async getUser(id: string): Promise<User | null> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, USERS_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return { id: docSnap.id, ...docSnap.data() } as User;
    },

    async listUsers(params: ListUsersParams = {}): Promise<{ data: User[]; total: number }> {
      const { db } = getFirebaseServices();
      const { limit = 25 } = params;

      const q = query(
        collection(db, USERS_COLLECTION),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit),
      );
      const snapshot = await getDocs(q);
      return { data: snapshot.docs.map(mapUserDoc), total: snapshot.size };
    },

    async updateUser(id: string, data: Partial<User>): Promise<User> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, USERS_COLLECTION, id);
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(docRef, updateData);

      return { id, ...data } as User;
    },
  };
}
