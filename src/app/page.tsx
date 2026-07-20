"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ShieldCheck, Sparkles, AlertCircle, Car, User, Mail, Lock } from "lucide-react";

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
    <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 text-on-background">
      
      {/* Decorative premium ambient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#ffe088]/5 blur-[120px] pointer-events-none" />
      
      {/* Fine thin grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-[420px] bg-[#121212]/75 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 relative">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="font-sans font-bold text-3xl tracking-wider text-primary uppercase text-glow">
            CabSy
          </h1>
          <p className="font-sans text-[10px] uppercase font-mono tracking-widest text-[#99907c] mt-1 text-center">
            Cabs are better shared
          </p>
        </div>

        {otpSent ? (
          <>
            <div className="mb-6 text-center">
              <h2 className="font-sans font-bold text-xl uppercase text-on-surface mb-1.5">
                Verification Required
              </h2>
              <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
                We sent a 6-digit OTP code to <br/>
                <span className="text-primary font-semibold font-mono">{email}</span>.
              </p>
            </div>

            {/* Error Notice */}
            {(authError || formError) && (
              <div className="mb-6 flex items-start gap-2 bg-[#93000a]/20 border border-[#93000a]/30 p-3.5 rounded-lg text-left">
                <AlertCircle size={15} className="text-[#ffb4ab] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#ffb4ab] leading-normal font-semibold">
                  {formError || authError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
              <div className="relative flex items-center bg-[#1A1A1A]/60 border border-neutral-800 rounded-lg focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/45 transition-all p-3">
                <ShieldCheck size={18} className="text-primary mr-3 flex-shrink-0" />
                <input
                  type="text"
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-outline font-semibold text-on-surface font-mono tracking-[0.4em] text-center"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary via-[#ffe088] to-primary text-black py-3.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(242,202,80,0.15)] disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify Code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode("");
                  setFormError(null);
                }}
                className="text-center font-mono text-[10px] uppercase tracking-widest text-[#99907c] hover:text-primary transition-colors mt-2"
              >
                Back to Sign In
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-[#181818] p-1 rounded-lg border border-neutral-800/80 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("login");
                  setFormError(null);
                }}
                className={`flex-1 py-2.5 rounded-md text-xs font-mono font-bold uppercase tracking-widest transition-all ${
                  activeTab === "login"
                    ? "bg-[#252525] text-primary border border-neutral-700/50 shadow-sm"
                    : "text-[#99907c] hover:text-on-surface"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("register");
                  setFormError(null);
                }}
                className={`flex-1 py-2.5 rounded-md text-xs font-mono font-bold uppercase tracking-widest transition-all ${
                  activeTab === "register"
                    ? "bg-[#252525] text-primary border border-neutral-700/50 shadow-sm"
                    : "text-[#99907c] hover:text-on-surface"
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Notice */}
            {(authError || formError) && (
              <div className="mb-6 flex items-start gap-2 bg-[#93000a]/20 border border-[#93000a]/30 p-3.5 rounded-lg text-left">
                <AlertCircle size={15} className="text-[#ffb4ab] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#ffb4ab] leading-normal font-semibold">
                  {formError || authError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {activeTab === "register" && (
                <div className="relative flex items-center bg-[#1A1A1A]/60 border border-neutral-800 rounded-lg focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/45 transition-all p-3">
                  <User size={16} className="text-[#99907c] mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    className="bg-transparent text-sm w-full focus:outline-none placeholder-neutral-600 font-medium text-on-surface"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="relative flex items-center bg-[#1A1A1A]/60 border border-neutral-800 rounded-lg focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/45 transition-all p-3">
                <Mail size={16} className="text-[#99907c] mr-3 flex-shrink-0" />
                <input
                  type="email"
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-neutral-600 font-medium text-on-surface"
                  placeholder="College Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative flex items-center bg-[#1A1A1A]/60 border border-neutral-800 rounded-lg focus-within:border-primary/80 focus-within:ring-1 focus-within:ring-primary/45 transition-all p-3">
                <Lock size={16} className="text-[#99907c] mr-3 flex-shrink-0" />
                <input
                  type="password"
                  className="bg-transparent text-sm w-full focus:outline-none placeholder-neutral-600 font-medium text-on-surface"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary via-[#ffe088] to-primary text-black py-3.5 rounded-lg font-mono text-xs font-bold uppercase tracking-widest mt-4 hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(242,202,80,0.15)] disabled:opacity-50"
              >
                {submitting ? "Processing..." : activeTab === "login" ? "Sign In" : "Register"}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}



