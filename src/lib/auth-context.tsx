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
  notifyEmail?: number;
  notifyChat?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresOTP: boolean; email?: string } | null>;
  verifyOTP: (email: string, code: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<{ requiresOTP: boolean; email?: string } | null>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, password: string) => Promise<boolean>;
  updatePreferences: (prefs: { notifyEmail?: boolean; notifyChat?: boolean }) => Promise<boolean>;
  demoLogin: () => Promise<boolean>;
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => null,
  verifyOTP: async () => false,
  signup: async () => null,
  forgotPassword: async () => false,
  resetPassword: async () => false,
  updatePreferences: async () => false,
  demoLogin: async () => false,
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

  const forgotPassword = async (email: string): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) return true;
      setAuthError(data.error || "Could not send reset code");
      return false;
    } catch {
      setAuthError("Could not send reset code. Please try again.");
      return false;
    }
  };

  const resetPassword = async (
    email: string,
    code: string,
    password: string
  ): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setAuthError(null);
        return true;
      }
      setAuthError(data.error || "Password reset failed");
      return false;
    } catch {
      setAuthError("Password reset failed. Please try again.");
      return false;
    }
  };

  const updatePreferences = async (prefs: {
    notifyEmail?: boolean;
    notifyChat?: boolean;
  }): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const demoLogin = async (): Promise<boolean> => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        return true;
      }
      setAuthError(data.error || "Could not start a demo session");
      return false;
    } catch {
      setAuthError("Could not start a demo session. Please try again.");
      return false;
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
      value={{ user, loading, login, verifyOTP, signup, forgotPassword, resetPassword, updatePreferences, demoLogin, signOut, authError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

