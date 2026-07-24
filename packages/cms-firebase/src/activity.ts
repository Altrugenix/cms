import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";

import { getFirebaseServices } from "./config";

const ACTIVITY_COLLECTION = "__cms_activity";

export interface ActivityEvent {
  id: string;
  action: "create" | "update" | "delete" | "publish" | "unpublish";
  collection: string;
  entryId?: string;
  userId: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface ListActivityParams {
  limit?: number;
  collection?: string;
  action?: string;
}

export interface FirestoreActivityProvider {
  recordActivity(event: Omit<ActivityEvent, "id" | "timestamp">): Promise<void>;
  listActivity(params?: ListActivityParams): Promise<{ data: ActivityEvent[]; total: number }>;
}

function mapActivityDoc(doc: QueryDocumentSnapshot<DocumentData>): ActivityEvent {
  return { id: doc.id, ...doc.data() } as ActivityEvent;
}

export function createFirestoreActivityProvider(): FirestoreActivityProvider {
  return {
    async listActivity(
      params: ListActivityParams = {},
    ): Promise<{ data: ActivityEvent[]; total: number }> {
      const { db } = getFirebaseServices();
      const { action, collection: collectionName, limit = 25 } = params;

      const constraints: QueryConstraint[] = [];

      if (collectionName) {
        constraints.push(where("collection", "==", collectionName));
      }
      if (action) {
        constraints.push(where("action", "==", action));
      }

      constraints.push(orderBy("timestamp", "desc"));
      constraints.push(firestoreLimit(limit));

      const q = query(collection(db, ACTIVITY_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      return { data: snapshot.docs.map(mapActivityDoc), total: snapshot.size };
    },

    async recordActivity(event: Omit<ActivityEvent, "id" | "timestamp">): Promise<void> {
      const { db } = getFirebaseServices();
      await addDoc(collection(db, ACTIVITY_COLLECTION), {
        ...event,
        timestamp: new Date().toISOString(),
      });
    },
  };
}
