"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getRide,
  subscribeToMessages,
  sendMessage,
  isMember,
  getUserMessageCount,
  MESSAGE_LIMIT,
  MESSAGE_WARN_AT,
} from "@/lib/firestore";
import ProtectedLayout from "@/components/layout/ProtectedLayout";
import { Ride, Message } from "@/types";
import { Send, ArrowLeft, AlertTriangle, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [ride, setRide] = useState<Ride | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [myCount, setMyCount] = useState(0);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load ride + check membership
  useEffect(() => {
    if (!id || !user) return;
    getRide(id).then(setRide);
    isMember(id, user.uid).then((ok) => {
      setAuthorized(ok);
      if (!ok) router.replace(`/rides/${id}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.uid]);

  // Realtime messages
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToMessages(id, setMessages);
    return () => unsub();
  }, [id]);

  // Refresh my count
  useEffect(() => {
    if (!id || !user) return;
    getUserMessageCount(id, user.uid).then(setMyCount);
  }, [messages.length, id, user?.uid]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !id || !text.trim()) return;
    if (myCount >= MESSAGE_LIMIT) return;
    setSending(true);
    setError("");
    try {
      await sendMessage(id, user.uid, user.displayName ?? "Student", text);
      setText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const atLimit = myCount >= MESSAGE_LIMIT;
  const nearLimit = myCount >= MESSAGE_WARN_AT && !atLimit;

  if (authorized === null) {
    return (
      <ProtectedLayout>
        <div className="max-w-2xl mx-auto flex flex-col gap-4 py-8">
          <div className="h-6 w-32 skeleton" />
          <div className="h-96 skeleton" />
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-variant">
          <Link href={`/rides/${id}`} className="p-2 border border-surface-variant hover:bg-surface-container-low rounded-full text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowLeft size={15} />
          </Link>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-on-surface-variant block mb-0.5">Ride chat</span>
            <p className="text-[15px] font-semibold text-on-surface truncate leading-tight">
              {ride?.pickup} → {ride?.destination}
            </p>
          </div>
          <span className="text-xs font-semibold bg-surface-container-low text-on-surface-variant px-3 py-1.5 rounded-full tabular-nums">
            {myCount} / {MESSAGE_LIMIT}
          </span>
        </div>

        {/* Chat Window */}
        <div className="card flex flex-col overflow-hidden" style={{ minHeight: "65vh" }}>

          {/* Expiration disclaimer */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-primary-container/40 border-b border-surface-variant text-[13px] text-on-surface-variant">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-primary" />
            <span>
              Messages are deleted after the travel date. Up to {MESSAGE_LIMIT} messages per rider — swap contact details before you run out.
            </span>
          </div>

          {/* Warnings */}
          {nearLimit && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-primary-container/60 border-b border-surface-variant text-[13px] text-on-surface font-medium">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-primary" />
              <span>Almost at the message limit — share a phone number or handle now.</span>
            </div>
          )}
          {atLimit && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-error-container border-b border-error/20 text-[13px] text-on-error-container font-medium">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-error" />
              <span>Message limit reached. Carry on over phone or another app.</span>
            </div>
          )}

          {/* Message List */}
          <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4 max-h-[450px]">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-on-surface-variant py-10 gap-2">
                <ShieldCheck size={28} className="text-primary/40" />
                <p className="text-sm font-semibold text-on-surface">Say hi to start planning</p>
                <p className="text-[13px] text-on-surface-variant max-w-[220px]">Sort out the pickup time and who&apos;s booking the cab.</p>
              </div>
            )}
            {messages.map((msg) => {
              const isMe = msg.uid === user?.uid;
              const ts = msg.createdAt?.toDate
                ? format(msg.createdAt.toDate(), "h:mm a")
                : "";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[75%] ${
                    isMe ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  {!isMe && (
                    <span className="text-xs text-on-surface-variant font-semibold px-1.5 mb-1">
                      {msg.displayName.split(" ")[0]}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2.5 text-[15px] leading-relaxed ${
                      isMe
                        ? "bg-primary text-on-primary font-medium rounded-2xl rounded-br-md"
                        : "bg-surface-container-high text-on-surface rounded-2xl rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[11px] text-on-surface-variant px-1 mt-1 tabular-nums">{ts}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input Panel */}
          <div className="relative border-t border-surface-variant p-4 flex gap-2.5 items-end bg-surface-container-low">
            {error && (
              <div className="absolute bottom-20 left-4 right-4 flex items-center gap-1.5 bg-error-container border border-error/20 text-on-error-container px-3 py-2 text-[13px] font-medium rounded-xl">
                <AlertTriangle size={12} />
                {error}
              </div>
            )}
            <textarea
              className="flex-grow input resize-none py-2.5 text-[15px] leading-relaxed"
              rows={1}
              placeholder={atLimit ? "Message limit reached" : "Say something…"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              disabled={atLimit}
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || atLimit || sending}
              className="w-11 h-11 flex-shrink-0 bg-primary text-on-primary hover:bg-primary-fixed rounded-full flex items-center justify-center transition-all disabled:opacity-40 focus:outline-none"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

