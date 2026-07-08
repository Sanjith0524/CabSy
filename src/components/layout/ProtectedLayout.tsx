"use client";

import Navbar from "@/components/layout/Navbar";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200/80 h-16 animate-pulse" />
        <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">
          {/* Skeleton Header */}
          <div className="h-10 w-48 skeleton" />
          {/* Skeleton Actions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 skeleton" />
            <div className="h-20 skeleton" />
          </div>
          {/* Skeleton List */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="h-28 skeleton" />
            <div className="h-28 skeleton" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-8">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
