"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, AlertCircle, Car, User, Mail, Lock } from "lucide-react";

const ALLOWED_DOMAINS = ["vitstudent.ac.in", "vit.ac.in"];

export default function HomePage() {
  const { user, loading, login, signup, verifyOTP, authError } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 2FA States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError("Email and password are required.");
      return;
    }

    const domain = email.trim().split("@")[1];
    if (!domain || !ALLOWED_DOMAINS.includes(domain.toLowerCase())) {
      setFormError("Only college email addresses are allowed (@vitstudent.ac.in or @vit.ac.in).");
      return;
    }

    setSubmitting(true);
    if (activeTab === "login") {
      const res = await login(email.trim(), password);
      if (res && res.requiresOTP) {
        setOtpSent(true);
      }
    } else {
      if (!name.trim()) {
        setFormError("Full name is required to register.");
        setSubmitting(false);
        return;
      }
      const res = await signup(name.trim(), email.trim(), password);
      if (res && res.requiresOTP) {
        setOtpSent(true);
      }
    }
    setSubmitting(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!otpCode.trim() || otpCode.length !== 6) {
      setFormError("A 6-digit verification code is required.");
      return;
    }

    setSubmitting(true);
    const success = await verifyOTP(email.trim(), otpCode.trim());
    if (success) {
      router.replace("/dashboard");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4 sm:p-6 text-on-background">

      {/* Soft ambient wash */}
      <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-24 w-[460px] h-[460px] rounded-full bg-primary/5 blur-[140px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-[420px] card rounded-3xl p-8 sm:p-10 shadow-lg z-10 relative">

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-9 h-9 rounded-xl bg-primary text-on-primary grid place-items-center shadow-sm">
              <Car size={18} />
            </span>
            <h1 className="font-display font-bold text-2xl tracking-tight text-on-surface">
              CabSy
            </h1>
          </div>
          <p className="text-sm text-on-surface-variant text-center">
            Cabs are better shared
          </p>
        </div>

        {otpSent ? (
          <>
            <div className="mb-6 text-center">
              <h2 className="font-display font-semibold text-xl text-on-surface mb-1.5">
                Check your inbox
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                We sent a 6-digit code to<br/>
                <span className="text-primary font-semibold">{email}</span>
              </p>
            </div>

            {(authError || formError) && (
              <div className="mb-6 flex items-start gap-2 bg-error-container border border-error/20 p-3.5 rounded-xl text-left">
                <AlertCircle size={15} className="text-error mt-0.5 flex-shrink-0" />
                <p className="text-sm text-on-error-container leading-normal font-medium">
                  {formError || authError}
                </p>
              </div>
            )}

            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
              <div className="relative flex items-center input px-3.5 py-3 focus-within:border-primary focus-within:bg-surface">
                <ShieldCheck size={18} className="text-primary mr-3 flex-shrink-0" />
                <input
                  type="text"
                  className="bg-transparent text-base w-full focus:outline-none placeholder-outline font-semibold text-on-surface font-mono tracking-[0.4em] text-center"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5">
                {submitting ? "Verifying…" : "Verify code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                  setFormError(null);
                }}
                className="text-center text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                Back to sign in
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-surface-container-low p-1 rounded-full mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setFormError(null);
                }}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === "login"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setFormError(null);
                }}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  activeTab === "register"
                    ? "bg-surface text-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Register
              </button>
            </div>

            {(authError || formError) && (
              <div className="mb-6 flex items-start gap-2 bg-error-container border border-error/20 p-3.5 rounded-xl text-left">
                <AlertCircle size={15} className="text-error mt-0.5 flex-shrink-0" />
                <p className="text-sm text-on-error-container leading-normal font-medium">
                  {formError || authError}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {activeTab === "register" && (
                <div className="relative flex items-center input px-3.5 py-3 focus-within:border-primary focus-within:bg-surface">
                  <User size={16} className="text-outline mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    className="bg-transparent text-base w-full focus:outline-none placeholder-outline font-medium text-on-surface"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="relative flex items-center input px-3.5 py-3 focus-within:border-primary focus-within:bg-surface">
                <Mail size={16} className="text-outline mr-3 flex-shrink-0" />
                <input
                  type="email"
                  className="bg-transparent text-base w-full focus:outline-none placeholder-outline font-medium text-on-surface"
                  placeholder="College email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative flex items-center input px-3.5 py-3 focus-within:border-primary focus-within:bg-surface">
                <Lock size={16} className="text-outline mr-3 flex-shrink-0" />
                <input
                  type="password"
                  className="bg-transparent text-base w-full focus:outline-none placeholder-outline font-medium text-on-surface"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3.5 mt-2">
                {submitting ? "Processing…" : activeTab === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="text-xs text-on-surface-variant text-center mt-6 leading-relaxed">
              Only verified <span className="text-on-surface font-medium">@vitstudent.ac.in</span> and{" "}
              <span className="text-on-surface font-medium">@vit.ac.in</span> emails can join.
            </p>
          </>
        )}

      </div>
    </div>
  );
}



