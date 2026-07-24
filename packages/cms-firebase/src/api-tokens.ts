import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { createHash, randomBytes } from "node:crypto";

import { getFirebaseServices } from "./config";

const TOKENS_COLLECTION = "__cms_api_tokens";

export interface ApiToken {
  id: string;
  name: string;
  lastFour: string;
  description: string;
  role: string;
  createdAt: string;
  createdBy: string;
  lastUsedAt: string | null;
}

export interface CreateApiTokenResult {
  rawToken: string;
  token: ApiToken;
}

export interface ListApiTokensParams {
  limit?: number;
  offset?: number;
}

export interface FirestoreApiTokensProvider {
  listApiTokens(params?: ListApiTokensParams): Promise<{ data: ApiToken[]; total: number }>;
  createApiToken(
    data: { name: string; description?: string; role?: string },
    createdBy: string,
  ): Promise<CreateApiTokenResult>;
  deleteApiToken(id: string): Promise<void>;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateRawToken(): string {
  return `cms_${randomBytes(32).toString("hex")}`;
}

function mapTokenDoc(docSnapshot: QueryDocumentSnapshot<DocumentData>): ApiToken {
  const data = docSnapshot.data();
  return {
    createdAt: data.createdAt as string,
    createdBy: data.createdBy as string,
    description: (data.description as string) ?? "",
    id: docSnapshot.id,
    lastFour: data.lastFour as string,
    lastUsedAt: (data.lastUsedAt as string | null) ?? null,
    name: data.name as string,
    role: (data.role as string) ?? "admin",
  };
}

export function createFirestoreApiTokensProvider(): FirestoreApiTokensProvider {
  return {
    async createApiToken(
      data: { name: string; description?: string; role?: string },
      createdBy: string,
    ): Promise<CreateApiTokenResult> {
      const { db } = getFirebaseServices();
      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);
      const lastFour = rawToken.slice(-4);
      const now = new Date().toISOString();

      const docRef = await addDoc(collection(db, TOKENS_COLLECTION), {
        createdAt: now,
        createdBy,
        description: data.description?.trim() ?? "",
        lastFour,
        name: data.name.trim(),
        role: data.role?.trim() ?? "admin",
        tokenHash,
      });

      return {
        rawToken,
        token: {
          createdAt: now,
          createdBy,
          description: data.description?.trim() ?? "",
          id: docRef.id,
          lastFour,
          lastUsedAt: null,
          name: data.name.trim(),
          role: data.role?.trim() ?? "admin",
        },
      };
    },

    async deleteApiToken(id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, TOKENS_COLLECTION, id));
    },

    async listApiTokens(
      params: ListApiTokensParams = {},
    ): Promise<{ data: ApiToken[]; total: number }> {
      const { db } = getFirebaseServices();
      const { limit = 25 } = params;

      const q = query(
        collection(db, TOKENS_COLLECTION),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit),
      );
      const snapshot = await getDocs(q);
      return { data: snapshot.docs.map(mapTokenDoc), total: snapshot.size };
    },
  };
}
