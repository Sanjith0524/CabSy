"use client";

import Navbar from "@/components/layout/Navbar";
import { useRequireAuth } from "@/hooks/use-require-auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Car, User, LogOut, ShieldAlert } from "lucide-react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useRequireAuth();
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-background">
        <div className="fixed top-0 w-full z-50 bg-surface border-b border-surface-variant h-16 animate-pulse" />
        <div className="pt-24 px-margin-desktop flex flex-col gap-6">
          <div className="h-10 w-48 skeleton" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 skeleton" />
            <div className="h-20 skeleton" />
          </div>
          <div className="flex flex-col gap-4 mt-4">
            <div className="h-28 skeleton" />
            <div className="h-28 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Navbar />

      {/* Main Content container */}
      <main className="pt-24 px-6 md:px-margin-desktop min-h-screen pb-24 sm:pb-12">
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}


