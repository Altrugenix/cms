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
  limit as firestoreLimit,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

import { getFirebaseServices } from "./config";

const MEDIA_COLLECTION = "__cms_media";
const MEDIA_FOLDERS_COLLECTION = "__cms_media_folders";

export interface MediaFile {
  id: string;
  name: string;
  alt: string;
  url: string;
  mimeType: string;
  size: number;
  folderId: string | null;
  createdAt: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface ListMediaParams {
  limit?: number;
  offset?: number;
  folderId?: string;
}

export interface FirebaseStorageProvider {
  uploadMedia(file: File, folderId?: string): Promise<MediaFile>;
  listMedia(params?: ListMediaParams): Promise<{ data: MediaFile[]; total: number }>;
  getMedia(id: string): Promise<MediaFile | null>;
  deleteMedia(id: string): Promise<void>;
  getMediaFile(id: string): Promise<string>;
  listFolders(): Promise<MediaFolder[]>;
  createFolder(name: string): Promise<MediaFolder>;
  renameFolder(id: string, name: string): Promise<void>;
  deleteFolder(id: string): Promise<void>;
}

function mapMediaDoc(doc: QueryDocumentSnapshot<DocumentData>): MediaFile {
  return { id: doc.id, ...doc.data() } as MediaFile;
}

function mapFolderDoc(doc: QueryDocumentSnapshot<DocumentData>): MediaFolder {
  return { id: doc.id, ...doc.data() } as MediaFolder;
}

export function createFirebaseStorageProvider(): FirebaseStorageProvider {
  return {
    async createFolder(name: string): Promise<MediaFolder> {
      const { db } = getFirebaseServices();
      const docRef = await addDoc(collection(db, MEDIA_FOLDERS_COLLECTION), {
        createdAt: new Date().toISOString(),
        name,
      });

      return {
        createdAt: new Date().toISOString(),
        id: docRef.id,
        name,
      };
    },

    async deleteFolder(id: string): Promise<void> {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, MEDIA_FOLDERS_COLLECTION, id));
    },

    async deleteMedia(id: string): Promise<void> {
      const { db, storage } = getFirebaseServices();
      const docRef = doc(db, MEDIA_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as { path?: string };
        if (data.path) {
          const storageRef = ref(storage, data.path);
          await deleteObject(storageRef);
        }
      }

      await deleteDoc(docRef);
    },

    async getMedia(id: string): Promise<MediaFile | null> {
      const { db } = getFirebaseServices();
      const docRef = doc(db, MEDIA_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return { id: docSnap.id, ...docSnap.data() } as MediaFile;
    },

    async getMediaFile(id: string): Promise<string> {
      const media = await this.getMedia(id);
      if (!media || !media.url) {
        throw new Error("Media not found");
      }
      return media.url;
    },

    async listFolders(): Promise<MediaFolder[]> {
      const { db } = getFirebaseServices();
      const q = query(collection(db, MEDIA_FOLDERS_COLLECTION), orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(mapFolderDoc);
    },

    async listMedia(params: ListMediaParams = {}): Promise<{ data: MediaFile[]; total: number }> {
      const { db } = getFirebaseServices();
      const { folderId, limit = 25 } = params;

      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc"), firestoreLimit(limit)];
      if (folderId) {
        constraints.unshift(where("folderId", "==", folderId));
      }

      const q = query(collection(db, MEDIA_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      return { data: snapshot.docs.map(mapMediaDoc), total: snapshot.size };
    },

    async renameFolder(id: string, name: string): Promise<void> {
      const { db } = getFirebaseServices();
      await updateDoc(doc(db, MEDIA_FOLDERS_COLLECTION, id), { name });
    },

    async uploadMedia(file: File, folderId?: string): Promise<MediaFile> {
      const { db, storage } = getFirebaseServices();
      const path = folderId ? `media/${folderId}/${file.name}` : `media/${file.name}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const docRef = await addDoc(collection(db, MEDIA_COLLECTION), {
        alt: "",
        createdAt: new Date().toISOString(),
        folderId: folderId ?? null,
        mimeType: file.type,
        name: file.name,
        path,
        size: file.size,
        url,
      });

      return {
        alt: "",
        createdAt: new Date().toISOString(),
        folderId: folderId ?? null,
        id: docRef.id,
        mimeType: file.type,
        name: file.name,
        size: file.size,
        url,
      };
    },
  };
}
