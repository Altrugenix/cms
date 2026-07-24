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

const ROLES_COLLECTION = "__cms_roles";

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListRolesParams {
  limit?: number;
  offset?: number;
}

export interface FirestoreRolesProvider {
  listRoles(params?: ListRolesParams): Promise<{ data: Role[]; total: number }>;
  getRole(id: string): Promise<Role | null>;
  createRole(data: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role>;
  updateRole(id: string, data: Partial<Role>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
}

function mapRoleDoc(doc: QueryDocumentSnapshot<DocumentData>): Role {
  return { id: doc.id, ...doc.data() } as Role;
}

export function createFirestoreRolesProvider(): FirestoreRolesProvider {
  return {
    async createRole(data: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role> {
      const { db } = getFirebaseServices();
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, ROLES_COLLECTION), {
        ...data,
        createdAt: now,
        updatedAt: now,
      });

      return { id: docRef.id, ...data, createdAt: now, updatedAt: now };
    },

    async deleteRole(id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, ROLES_COLLECTION, id));
    },

    async getRole(id: string): Promise<Role | null> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, ROLES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return { id: docSnap.id, ...docSnap.data() } as Role;
    },

    async listRoles(params: ListRolesParams = {}): Promise<{ data: Role[]; total: number }> {
      const { db } = getFirebaseServices();
      const { limit = 25 } = params;

      const q = query(
        collection(db, ROLES_COLLECTION),
        orderBy("name", "asc"),
        firestoreLimit(limit),
      );
      const snapshot = await getDocs(q);
      return { data: snapshot.docs.map(mapRoleDoc), total: snapshot.size };
    },

    async updateRole(id: string, data: Partial<Role>): Promise<Role> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, ROLES_COLLECTION, id);
      const updateData = { ...data, updatedAt: new Date().toISOString() };
      await updateDoc(docRef, updateData);

      return { id, ...data } as Role;
    },
  };
}
