import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "CabSy",
  description:
    "Connect with fellow students heading the same way. Split the fare, not the trust.",
  icons: {
    icon: "/logo1.jpeg",
    apple: "/logo1.jpeg",
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
        className={`${dmSans.variable} ${syne.variable} font-sans bg-background text-on-background antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <div className="flex-1 flex flex-col">
            <div className="flex-1">{children}</div>
            <footer className="w-full py-6 border-t border-surface-variant/40 bg-background/50 text-center font-mono text-[9px] text-on-surface-variant/70 tracking-widest uppercase z-40">
              CabSy © 2026 . v1.0
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}



