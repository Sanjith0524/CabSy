"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, isAllowedEmail } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email ?? "";
        if (!isAllowedEmail(email)) {
          await firebaseSignOut(auth);
          setUser(null);
          setAuthError("Access restricted to college email addresses only.");
        } else {
          setUser(firebaseUser);
          setAuthError(null);
          // Upsert user profile in Firestore
          const ref = doc(db, "users", firebaseUser.uid);
          const snap = await getDoc(ref);
          if (!snap.exists()) {
            const domain = email.split("@")[1];
            await setDoc(ref, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? "Student",
              email,
              photoURL: firebaseUser.photoURL ?? "",
              college: domain,
              createdAt: serverTimestamp(),
            });
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email ?? "";
      if (!isAllowedEmail(email)) {
        await firebaseSignOut(auth);
        setAuthError(
          "Only college email addresses are allowed. Please use your @vitstudent.ac.in or @vit.ac.in account."
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("popup-closed")) return;
      setAuthError("Sign-in failed. Please try again.");
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signOut, authError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
