"use client";

import { useEffect, useState } from "react";
import {
  Share,
  SquarePlus,
  EllipsisVertical,
  Download,
  X,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/** Chrome/Edge/Samsung fire this when the app is installable. Not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform =
  | "android-native" // one-tap install via beforeinstallprompt
  | "android-manual" // Android browser that never fired the event (Firefox, etc.)
  | "android-inapp" // Instagram / Facebook / other WebView — can't install here
  | "ios-safari"
  | "ios-chrome"
  | "ios-other"; // in-app browsers and iOS browsers without Add to Home Screen

const IN_APP_UA = /FBAN|FBAV|Instagram|Line\/|Snapchat|LinkedInApp|Twitter|MicroMessenger/i;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Platform for the manual guide, or null when we shouldn't show one (desktop). */
function detectPlatform(): Exclude<Platform, "android-native"> | null {
  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS
  const isAndroid = /Android/.test(ua);

  if (isIOS) {
    if (IN_APP_UA.test(ua)) return "ios-other";
    if (/CriOS/.test(ua)) return "ios-chrome";
    if (/FxiOS|EdgiOS|OPiOS/.test(ua)) return "ios-other";
    return /Safari/.test(ua) ? "ios-safari" : "ios-other";
  }
  if (isAndroid) {
    if (IN_APP_UA.test(ua) || /; wv\)/.test(ua)) return "android-inapp";
    return "android-manual";
  }
  return null;
}

/**
 * Step-by-step "Add to Home Screen" guide for signed-in mobile users.
 * Also registers the service worker, which Chrome needs to offer installation.
 */
export default function InstallPrompt() {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    const manual = detectPlatform();
    if (!manual) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep Chrome's mini-infobar away; we show our own button
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform("android-native");
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // Give Chrome a moment to fire beforeinstallprompt before falling back to
    // manual steps, so Android users don't see the sheet change under them.
    const t = setTimeout(() => {
      setPlatform((p) => p ?? manual);
      setOpen(true);
    }, manual === "android-manual" ? 2000 : 0);

    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!user || !open || !platform) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the URL is shown as text anyway */
    }
  };

  // Android WebViews can hand the page off to Chrome via an intent URL.
  const chromeIntent = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:hidden">
      <div
        role="dialog"
        aria-label="Add CabSy to your home screen"
        className="relative mx-auto max-w-md rounded-2xl border border-surface-variant bg-surface text-on-surface shadow-lg p-5"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-md" />
          <div>
            <p className="font-semibold">Add CabSy to your home screen</p>
            <p className="text-xs text-on-surface-variant">
              Opens like an app — one tap, full screen.
            </p>
          </div>
        </div>

        <div className="mt-4">
          {platform === "android-native" && (
            <button
              onClick={install}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-on-primary font-semibold py-3"
            >
              <Download size={18} />
              Install app
            </button>
          )}

          {platform === "ios-safari" && (
            <Steps
              steps={[
                <>Tap the <Kbd><Share size={14} /> Share</Kbd> button in Safari&apos;s toolbar</>,
                <>Scroll down and tap <Kbd><SquarePlus size={14} /> Add to Home Screen</Kbd></>,
                <>Tap <Kbd>Add</Kbd> in the top-right corner</>,
              ]}
            />
          )}

          {platform === "ios-chrome" && (
            <Steps
              steps={[
                <>Tap the <Kbd><Share size={14} /> Share</Kbd> button in the address bar</>,
                <>Tap <Kbd><SquarePlus size={14} /> Add to Home Screen</Kbd></>,
                <>Tap <Kbd>Add</Kbd> to confirm</>,
              ]}
            />
          )}

          {platform === "android-manual" && (
            <Steps
              steps={[
                <>Tap the <Kbd><EllipsisVertical size={14} /> menu</Kbd> in your browser</>,
                <>Tap <Kbd>Install app</Kbd> or <Kbd>Add to Home screen</Kbd></>,
                <>Confirm with <Kbd>Install</Kbd> / <Kbd>Add</Kbd></>,
              ]}
            />
          )}

          {platform === "ios-other" && (
            <>
              <p className="text-sm text-on-surface-variant">
                This browser can&apos;t add apps to your home screen. Copy the link and open it
                in <span className="font-semibold text-on-surface">Safari</span>, then use
                Share → Add to Home Screen.
              </p>
              <CopyButton copied={copied} onClick={copyLink} />
            </>
          )}

          {platform === "android-inapp" && (
            <>
              <p className="text-sm text-on-surface-variant">
                You&apos;re inside another app&apos;s browser. Open CabSy in{" "}
                <span className="font-semibold text-on-surface">Chrome</span> to install it.
              </p>
              <a
                href={chromeIntent}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-full bg-primary text-on-primary font-semibold py-3"
              >
                <ExternalLink size={18} />
                Open in Chrome
              </a>
              <CopyButton copied={copied} onClick={copyLink} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Steps({ steps }: { steps: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary-container text-on-primary-container text-xs font-semibold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="pt-0.5 leading-relaxed">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm bg-surface-container-high px-1.5 py-0.5 font-medium align-middle">
      {children}
    </span>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 w-full flex items-center justify-center gap-2 rounded-full border border-outline-variant font-semibold py-3"
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}
