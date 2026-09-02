"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, Search, Plus, User, LogOut, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { useTheme } from "@/hooks/use-theme";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="fixed top-0 w-full z-50 glass-panel border-0 border-b border-surface-variant h-16">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">

        {/* Left Side: Brand Name & Desktop Navigation */}
        <div className="flex items-center gap-10">
          <Link href="/dashboard" className="flex items-center group">
            <span className="font-display font-bold text-xl text-on-surface tracking-tight">
              CabSy
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden sm:flex items-center gap-1">
            {desktopLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "px-3.5 py-2 rounded-full text-sm transition-colors",
                  pathname === href
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-medium"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side */}
        <div className="flex items-center">

          {/* MOBILE NAV — icon only, colour-only active state */}
          <nav className="flex sm:hidden items-center gap-1">
            {mobileLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={pathname === href ? "page" : undefined}
                className={clsx(
                  "flex items-center justify-center w-11 h-11 rounded-full",
                  pathname === href ? "text-primary" : "text-on-surface-variant"
                )}
              >
                <Icon size={20} />
              </Link>
            ))}
          </nav>

          {/* DESKTOP PROFILE DROPDOWN */}
          <div className="hidden sm:block">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 p-1 border border-surface-variant hover:border-outline-variant rounded-full transition-colors focus:outline-none pr-3.5"
              >
                {user?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt={user.displayName ?? ""}
                    className="w-8 h-8 object-cover rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-container rounded-full flex items-center justify-center text-xs font-bold text-on-primary-container">
                    {initials}
                  </div>
                )}
                {user?.displayName && (
                  <span className="text-sm font-semibold text-on-surface-variant pl-0.5">
                    {user.displayName.split(" ")[0]}
                  </span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-surface border border-surface-variant rounded-2xl shadow-lg py-1.5 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-variant">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {user?.displayName ?? "Student"}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={15} className="text-primary" />
                    My profile
                  </Link>
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors text-left"
                  >
                    {theme === "dark" ? <Sun size={15} className="text-primary" /> : <Moon size={15} className="text-primary" />}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </button>
                  <div className="border-t border-surface-variant my-1" />
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-error hover:bg-error-container transition-colors text-left"
                  >
                    <LogOut size={15} />
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


