import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

import { getFirebaseServices } from "./config";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: string | undefined;
}

export interface FirebaseAuthProvider {
  login(email: string, password: string): Promise<AuthUser>;
  register(email: string, password: string, name: string): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  getIdToken(): Promise<string | null>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}

async function mapFirebaseUser(user: User): Promise<AuthUser> {
  const tokenResult = await user.getIdTokenResult();
  return {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    role: (tokenResult.claims.role as string | undefined) ?? undefined,
    uid: user.uid,
  };
}

export function createFirebaseAuthProvider(): FirebaseAuthProvider {
  return {
    async forgotPassword(email: string): Promise<void> {
      const { auth } = getFirebaseServices();
      await sendPasswordResetEmail(auth, email);
    },

    async getCurrentUser(): Promise<AuthUser | null> {
      const { auth } = getFirebaseServices();
      const user = auth.currentUser;
      if (!user) {
        return null;
      }
      return mapFirebaseUser(user);
    },

    async getIdToken(): Promise<string | null> {
      const { auth } = getFirebaseServices();
      const user = auth.currentUser;
      if (!user) {
        return null;
      }
      return user.getIdToken();
    },

    async login(email: string, password: string): Promise<AuthUser> {
      const { auth } = getFirebaseServices();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(credential.user);
    },

    async logout(): Promise<void> {
      const { auth } = getFirebaseServices();
      await firebaseSignOut(auth);
    },

    onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
      const { auth } = getFirebaseServices();
      return onAuthStateChanged(auth, (user) => {
        if (!user) {
          callback(null);
          return;
        }
        void mapFirebaseUser(user).then(callback);
      });
    },

    async register(email: string, password: string, name: string): Promise<AuthUser> {
      const { auth } = getFirebaseServices();
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      return mapFirebaseUser(credential.user);
    },

    async resetPassword(token: string, password: string): Promise<void> {
      const { auth } = getFirebaseServices();
      await confirmPasswordReset(auth, token, password);
    },
  };
}
