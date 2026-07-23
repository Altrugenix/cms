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
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
}

interface FirebaseUserWithClaims extends User {
  claims?: { role?: string };
}

function mapFirebaseUser(user: User): AuthUser {
  const userWithClaims = user as FirebaseUserWithClaims;
  return {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    role: userWithClaims.claims?.role,
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
        callback(user ? mapFirebaseUser(user) : null);
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
