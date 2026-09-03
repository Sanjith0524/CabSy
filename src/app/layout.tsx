import type { Metadata } from "next";
import { Figtree, Bricolage_Grotesque, DM_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import DemoBadge from "@/components/DemoBadge";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CabSy",
  description:
    "Connect with fellow students heading the same way. Split the fare, not the trust.",
  icons: {
    icon: [
      {
        url: "/logo1.jpeg",
        sizes: "180x180",
        type: "image/jpeg",
      },
    ],
    apple: [
      {
        url: "/logo1.jpeg",
        sizes: "180x180",
        type: "image/jpeg",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "CabSy",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'light' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                  document.documentElement.classList.remove('dark')
                  document.documentElement.classList.add('light')
                } else {
                  document.documentElement.classList.add('dark')
                  document.documentElement.classList.remove('light')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${figtree.variable} ${bricolage.variable} ${dmMono.variable} font-sans bg-background text-on-background antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <DemoBadge />
          <div className="flex-1 flex flex-col">
            <div className="flex-1">{children}</div>
            <footer className="w-full py-6 border-t border-surface-variant/50 text-center font-mono text-[11px] text-on-surface-variant/70 tracking-[0.14em] uppercase z-40">
              CabSy © 2026 · v1.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}



