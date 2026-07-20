"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  college: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresOTP: boolean; email?: string } | null>;
  verifyOTP: (email: string, code: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<{ requiresOTP: boolean; email?: string } | null>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
  verifyOTP: async () => false,
  signup: async () => null,
  signOut: async () => {},
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresOTP) {
          return { requiresOTP: true, email: data.email };
        }
        if (data.user) {
          setUser(data.user);
          setAuthError(null);
          return { requiresOTP: false };
        }
      }
      setAuthError(data.error || "Login failed");
      return null;
    } catch (err) {
      setAuthError("Sign-in failed. Please try again.");
      return null;
    }
  };

  const verifyOTP = async (email: string, code: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setAuthError(null);
        return true;
      } else {
        setAuthError(data.error || "Verification failed");
        return false;
      }
    } catch (err) {
      setAuthError("Verification failed. Please try again.");
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresOTP) {
          return { requiresOTP: true, email: data.email };
        }
        if (data.user) {
          setUser(data.user);
          setAuthError(null);
          return { requiresOTP: false };
        }
      }
      setAuthError(data.error || "Registration failed");
      return null;
    } catch (err) {
      setAuthError("Registration failed. Please try again.");
      return null;
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verifyOTP, signup, signOut, authError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

