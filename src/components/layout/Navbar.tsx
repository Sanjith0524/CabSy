"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Car, LayoutDashboard, Search, Plus, User, LogOut, Bell } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const domain = user?.email?.split("@")[1] ?? "";

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/rides", label: "Find Rides", icon: Search },
    { href: "/rides/create", label: "Post Ride", icon: Plus },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left Side: Brand Logo + Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center transition-transform group-hover:scale-105">
              <Car className="text-white" size={16} />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-sm text-brand tracking-tight leading-none">
                Cabsy
              </span>
              <span className="text-[10px] text-gray-400 font-semibold leading-none mt-0.5">
                COLLEGE RIDES
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1.5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                  pathname === href
                    ? "bg-brand-light text-brand font-semibold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side: Verify badge + User Action Menu */}
        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {domain}
          </span>

          <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <Bell size={18} />
          </button>

          {/* User profile dropdown menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 p-1 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
            >
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? ""}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-[10px] font-bold text-brand">
                  {initials}
                </div>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                <div className="px-4 py-2.5 border-b border-gray-150">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.displayName ?? "Student"}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={15} className="text-gray-400" />
                  My Profile
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    signOut();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 flex py-1.5 z-40 shadow-lg">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-colors",
              pathname === href ? "text-brand" : "text-gray-400"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
        <Link
          href="/profile"
          className={clsx(
            "flex-1 flex flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-colors",
            pathname === "/profile" ? "text-brand" : "text-gray-400"
          )}
        >
          <User size={18} />
          Profile
        </Link>
      </nav>
    </header>
  );
}
