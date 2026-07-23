import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";

import { getFirebaseServices } from "./config";

export interface ListParams {
  limit?: number;
  offset?: number;
  sort?: string;
  filter?: Record<string, unknown>;
  select?: string[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface FirestoreContentProvider {
  listEntries<T>(slug: string, params?: ListParams): Promise<PaginatedResult<T>>;
  getEntry<T>(slug: string, id: string): Promise<T | null>;
  createEntry<T>(slug: string, data: Partial<T>): Promise<T>;
  updateEntry<T>(slug: string, id: string, data: Partial<T>): Promise<T>;
  deleteEntry(slug: string, id: string): Promise<void>;
  bulkDelete(slug: string, ids: string[]): Promise<void>;
  publishEntry(slug: string, id: string): Promise<void>;
  unpublishEntry(slug: string, id: string): Promise<void>;
  restoreEntry(slug: string, id: string): Promise<void>;
}

function mapDocument<T>(doc: QueryDocumentSnapshot<DocumentData>): T {
  return { id: doc.id, ...doc.data() } as T;
}

export function createFirestoreContentProvider(): FirestoreContentProvider {
  return {
    async bulkDelete(slug: string, ids: string[]): Promise<void> {
      const { db } = getFirebaseServices();
      const deletePromises = ids.map((id) => deleteDoc(doc(db, slug, id)));
      await Promise.all(deletePromises);
    },

    async createEntry<T>(slug: string, data: Partial<T>): Promise<T> {
      const { db } = getFirebaseServices();
      const docRef = await addDoc(collection(db, slug), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { id: docRef.id, ...data } as T;
    },

    async deleteEntry(slug: string, id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, slug, id));
    },

    async getEntry<T>(slug: string, id: string): Promise<T | null> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, slug, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return { id: docSnap.id, ...docSnap.data() } as T;
    },

    async listEntries<T>(slug: string, params: ListParams = {}): Promise<PaginatedResult<T>> {
      const { db } = getFirebaseServices();
      const { filter, limit: queryLimit = 25, offset = 0, sort } = params;

      const constraints: QueryConstraint[] = [];

      if (filter) {
        for (const [field, value] of Object.entries(filter)) {
          constraints.push(where(field, "==", value));
        }
      }

      if (sort) {
        const parts = sort.split(":");
        const field = parts[0];
        const direction = (parts[1] || "asc") as "asc" | "desc";
        if (field) {
          constraints.push(orderBy(field, direction));
        }
      }

      if (offset > 0) {
        const offsetQuery = query(collection(db, slug), ...constraints, limit(offset));
        const offsetSnapshot = await getDocs(offsetQuery);
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        if (lastDoc) {
          constraints.push(startAfter(lastDoc));
        }
      }

      constraints.push(limit(queryLimit));

      const q = query(collection(db, slug), ...constraints);
      const snapshot = await getDocs(q);

      return {
        data: snapshot.docs.map(mapDocument<T>),
        limit: queryLimit,
        offset,
        total: snapshot.size,
      };
    },

    async publishEntry(slug: string, id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, slug, id), {
        _status: "published",
        updatedAt: new Date().toISOString(),
      });
    },

    async restoreEntry(slug: string, id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, slug, id), {
        _deletedAt: null,
        updatedAt: new Date().toISOString(),
      });
    },

    async unpublishEntry(slug: string, id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, slug, id), {
        _status: "draft",
        updatedAt: new Date().toISOString(),
      });
    },

    async updateEntry<T>(slug: string, id: string, data: Partial<T>): Promise<T> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, slug, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      return { id, ...data } as T;
    },
  };
}
