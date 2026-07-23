import { doc, getDoc, setDoc } from "firebase/firestore";

import { getFirebaseServices } from "./config";

const GLOBALS_COLLECTION = "__cms_globals";

export interface FirestoreGlobalsProvider {
  getGlobal<T>(slug: string): Promise<T | null>;
  upsertGlobal<T>(slug: string, data: Partial<T>): Promise<T>;
}

export function createFirestoreGlobalsProvider(): FirestoreGlobalsProvider {
  return {
    async getGlobal<T>(slug: string): Promise<T | null> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, GLOBALS_COLLECTION, slug);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return { id: docSnap.id, ...docSnap.data() } as T;
    },

    async upsertGlobal<T>(slug: string, data: Partial<T>): Promise<T> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, GLOBALS_COLLECTION, slug);
      await setDoc(docRef, data, { merge: true });

      return { id: slug, ...data } as T;
    },
  };
}
