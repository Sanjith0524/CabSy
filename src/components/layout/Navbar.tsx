"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Search, Plus, User, LogOut, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
    setTheme(nextTheme);
  };

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Desktop links (no Profile tab)
  const desktopLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/rides", label: "Find Rides" },
    { href: "/rides/create", label: "Post Ride" },
  ];

  // Mobile links (includes Profile tab with User icon)
  const mobileLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/rides", label: "Find Rides", icon: Search },
    { href: "/rides/create", label: "Post Ride", icon: Plus },
    { href: "/profile", label: "Profile", icon: User },
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
    <header className="fixed top-0 w-full z-50 bg-surface border-b border-surface-variant h-16">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
        
        {/* Left Side: Brand Name & Desktop Navigation */}
        <div className="flex items-center gap-12">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <span className="font-sans font-bold text-2xl text-primary tracking-tighter text-glow">
              CabSy
            </span>
          </Link>

          {/* DESKTOP NAV: Visible only on desktop (sm and up) next to CabSy */}
          <nav className="hidden sm:flex items-center gap-8">
            {desktopLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "font-sans text-xs font-bold uppercase tracking-widest transition-all duration-200 pb-1 border-b-2",
                  pathname === href
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-white"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side: Desktop Profile Dropdown / Mobile Navigation Links */}
        <div className="flex items-center">
          
          {/* MOBILE NAV: Visible only on mobile (below sm) on the right side */}
          <nav className="flex sm:hidden items-center gap-2">
            {mobileLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-all duration-200 border-b border-transparent",
                  pathname === href 
                    ? "text-primary border-primary bg-primary/5" 
                    : "text-on-surface-variant hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={16} />
                <span className="text-[7.5px] font-semibold mt-0.5 tracking-wider uppercase">{label.split(" ")[0]}</span>
              </Link>
            ))}
          </nav>

          {/* DESKTOP ONLY RIGHT PANEL: Profile Dropdown (hidden on mobile) */}
          <div className="hidden sm:block">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 p-0.5 border border-surface-variant hover:border-primary rounded-full transition-colors focus:outline-none pr-3"
              >
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ""}
                    className="w-8 h-8 object-cover rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-surface-container-high rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-primary">
                    {initials}
                  </div>
                )}
                {user?.displayName && (
                  <span className="font-sans text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">
                    {user.displayName.split(" ")[0]}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface-container border border-surface-variant shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                  <div className="px-4 py-2.5 border-b border-surface-variant">
                    <p className="text-xs font-mono font-semibold text-on-surface truncate">
                      {user?.displayName ?? "Student"}
                    </p>
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={12} className="text-primary" />
                    My Profile
                  </Link>
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors text-left"
                  >
                    {theme === "dark" ? <Sun size={12} className="text-primary" /> : <Moon size={12} className="text-primary" />}
                    Theme
                  </button>
                  <div className="border-t border-surface-variant my-1" />
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-red-400 hover:bg-red-950/20 transition-colors text-left"
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}


