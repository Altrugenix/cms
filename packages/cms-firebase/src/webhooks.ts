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

const WEBHOOKS_COLLECTION = "__cms_webhooks";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  collection: string;
  enabled: boolean;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
  lastStatus: number | null;
  lastSuccess: boolean;
  lastError: string;
  lastDeliveredAt: string | null;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  events: string[];
  collection?: string;
  secret?: string;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: string[];
  collection?: string;
  enabled?: boolean;
  secret?: string;
}

export interface ListWebhooksParams {
  limit?: number;
  offset?: number;
}

export interface FirestoreWebhooksProvider {
  listWebhooks(params?: ListWebhooksParams): Promise<{ data: Webhook[]; total: number }>;
  getWebhook(id: string): Promise<Webhook | null>;
  createWebhook(data: CreateWebhookData): Promise<Webhook>;
  updateWebhook(id: string, data: UpdateWebhookData): Promise<Webhook>;
  deleteWebhook(id: string): Promise<void>;
}

function mapWebhookDoc(docSnapshot: QueryDocumentSnapshot<DocumentData>): Webhook {
  const data = docSnapshot.data();
  return {
    collection: (data.collection as string) ?? "*",
    createdAt: data.createdAt as string,
    enabled: (data.enabled as boolean) ?? true,
    events: (data.events as string[]) ?? [],
    hasSecret: Boolean(data.secret),
    id: docSnapshot.id,
    lastDeliveredAt: (data.lastDeliveredAt as string | null) ?? null,
    lastError: (data.lastError as string) ?? "",
    lastStatus: (data.lastStatus as number | null) ?? null,
    lastSuccess: (data.lastSuccess as boolean) ?? false,
    name: data.name as string,
    updatedAt: data.updatedAt as string,
    url: data.url as string,
  };
}

function mapWebhookDocFromSnapshot(
  docSnapshot: Awaited<ReturnType<typeof getDoc>>,
): Webhook | null {
  if (!docSnapshot.exists()) return null;
  const data = docSnapshot.data() as Record<string, unknown>;
  return {
    collection: (data.collection as string) ?? "*",
    createdAt: data.createdAt as string,
    enabled: (data.enabled as boolean) ?? true,
    events: (data.events as string[]) ?? [],
    hasSecret: Boolean(data.secret),
    id: docSnapshot.id,
    lastDeliveredAt: (data.lastDeliveredAt as string | null) ?? null,
    lastError: (data.lastError as string) ?? "",
    lastStatus: (data.lastStatus as number | null) ?? null,
    lastSuccess: (data.lastSuccess as boolean) ?? false,
    name: data.name as string,
    updatedAt: data.updatedAt as string,
    url: data.url as string,
  };
}

export function createFirestoreWebhooksProvider(): FirestoreWebhooksProvider {
  return {
    async createWebhook(data: CreateWebhookData): Promise<Webhook> {
      const { db } = getFirebaseServices();
      const now = new Date().toISOString();

      const docRef = await addDoc(collection(db, WEBHOOKS_COLLECTION), {
        collection: data.collection?.trim() || "*",
        createdAt: now,
        enabled: true,
        events: data.events,
        lastDeliveredAt: null,
        lastError: "",
        lastStatus: null,
        lastSuccess: false,
        name: data.name.trim(),
        secret: data.secret?.trim() ?? "",
        updatedAt: now,
        url: data.url.trim(),
      });

      return {
        collection: data.collection?.trim() || "*",
        createdAt: now,
        enabled: true,
        events: data.events,
        hasSecret: Boolean(data.secret),
        id: docRef.id,
        lastDeliveredAt: null,
        lastError: "",
        lastStatus: null,
        lastSuccess: false,
        name: data.name.trim(),
        updatedAt: now,
        url: data.url.trim(),
      };
    },

    async deleteWebhook(id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, WEBHOOKS_COLLECTION, id));
    },

    async getWebhook(id: string): Promise<Webhook | null> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, WEBHOOKS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      return mapWebhookDocFromSnapshot(docSnap);
    },

    async listWebhooks(
      params: ListWebhooksParams = {},
    ): Promise<{ data: Webhook[]; total: number }> {
      const { db } = getFirebaseServices();
      const { limit = 25 } = params;

      const q = query(
        collection(db, WEBHOOKS_COLLECTION),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit),
      );
      const snapshot = await getDocs(q);
      return { data: snapshot.docs.map(mapWebhookDoc), total: snapshot.size };
    },

    async updateWebhook(id: string, data: UpdateWebhookData): Promise<Webhook> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, WEBHOOKS_COLLECTION, id);
      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = { updatedAt: now };

      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.url !== undefined) updateData.url = data.url.trim();
      if (data.events !== undefined) updateData.events = data.events;
      if (data.collection !== undefined) updateData.collection = data.collection.trim() || "*";
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.secret !== undefined) updateData.secret = data.secret.trim();

      await updateDoc(docRef, updateData);

      const updated = await getDoc(docRef);
      return mapWebhookDocFromSnapshot(updated) as Webhook;
    },
  };
}
