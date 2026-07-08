"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Car, ShieldCheck, CreditCard, Sparkles, AlertCircle } from "lucide-react";
import { ALLOWED_DOMAINS } from "@/lib/firebase";

export default function HomePage() {
  const { user, loading, signInWithGoogle, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Left side: Premium Branding & Core Value Pillars */}
      <div className="w-full md:w-[45%] bg-brand p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
        {/* Abstract background gradient effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-light/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Car className="text-white" size={16} />
          </div>
          <span className="font-display font-extrabold text-sm tracking-widest text-white/90">
            CABSY · COLLEGE RIDES
          </span>
        </div>

        {/* Hero Pitch */}
        <div className="my-auto py-12 z-10 max-w-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-white/95 mb-6 backdrop-blur-sm">
            <Sparkles size={12} className="text-accent" />
            Exclusive to Verified Students
          </span>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl leading-tight tracking-tight mb-4">
            Simplify your campus travel.
          </h1>
          <p className="text-white/80 text-sm leading-relaxed mb-8">
            Connect with verified peers, split travel costs to airports or transit stations, and travel securely together.
          </p>

          {/* Pillars List */}
          <div className="flex flex-col gap-4 text-sm font-medium">
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-accent flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white font-semibold">100% Student Verified</p>
                <p className="text-white/70 text-xs mt-0.5">Restricted strictly to your official college domain.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="text-accent flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-white font-semibold">Zero Commission Fee</p>
                <p className="text-white/70 text-xs mt-0.5">We don&apos;t handle payments. Coordinate directly with your group.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <p className="text-[11px] text-white/40 leading-normal z-10">
          Cabsy is an student coordination platform. Users are solely responsible for booking and travel coordination.
        </p>
      </div>

      {/* Right side: Modern Auth Portal */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm bg-white p-8 rounded-xl border border-gray-200/60 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500">
              Sign in with your university account to continue.
            </p>
          </div>

          {/* Error Notice */}
          {authError && (
            <div className="mb-5 flex items-start gap-2 bg-red-50 border border-red-150 rounded-lg p-3 text-left">
              <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 leading-normal font-medium">{authError}</p>
            </div>
          )}

          {/* Google SSO button */}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-2.5 bg-white border border-gray-200/80 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-lg text-sm shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all duration-150 active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {/* Verification listing */}
          <div className="mt-8 pt-6 border-t border-gray-150">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Approved Campus Domains
            </h3>
            <div className="flex flex-col gap-2">
              {ALLOWED_DOMAINS.map((domain) => (
                <div key={domain} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-200/50 px-3 py-2 rounded-lg text-gray-600 font-medium">
                  <span>@{domain}</span>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <ShieldCheck size={10} />
                    Verified
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-gray-400 leading-normal">
              Authentication checks domain names recursively. Sign-in requests from outside the approved networks are auto-blocked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
