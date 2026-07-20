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
import { Send, ArrowLeft, AlertTriangle, Info, ShieldCheck, Lock } from "lucide-react";
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
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-surface-variant">
          <Link href={`/rides/${id}`} className="p-2 border border-surface-variant hover:bg-white/5 rounded-none text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowLeft size={14} />
          </Link>
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[9px] text-[#99907c] uppercase tracking-widest block mb-0.5">Ride Coordination Chat</span>
            <p className="text-sm font-semibold text-on-surface truncate leading-tight">
              {ride?.pickup} → {ride?.destination}
            </p>
          </div>
          <span className="font-mono text-[9px] bg-surface-container-low border border-surface-variant text-primary px-3 py-1 uppercase tracking-wider font-bold">
            {myCount} / {MESSAGE_LIMIT} msgs
          </span>
        </div>

        {/* Chat Window */}
        <div className="card flex flex-col overflow-hidden" style={{ minHeight: "65vh" }}>
          
          {/* Expiration disclaimer */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#ffe088]/5 border-b border-[#ffe088]/10 text-xs text-primary font-medium">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-primary" />
            <span>
              All message histories auto-expire after travel date. Personal information limits allow up to {MESSAGE_LIMIT} messages per rider.
            </span>
          </div>

          {/* Warnings */}
          {nearLimit && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#ffe088]/10 border-b border-[#ffe088]/20 text-xs text-[#ffe088] font-semibold">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[#f2ca50]" />
              <span>
                Nearing message thresholds. Exchanging contact handles is suggested.
              </span>
            </div>
          )}
          {atLimit && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-[#93000a]/15 border-b border-[#93000a]/30 text-xs text-[#ffb4ab] font-semibold">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
              <span>
                Message thresholds reached. Please coordinate via other offline methods.
              </span>
            </div>
          )}

          {/* Security Banner */}
          <div className="flex justify-center my-4">
            <div className="bg-surface-container-low px-4 py-1.5 border border-surface-variant flex items-center gap-2">
              <Lock size={12} className="text-primary" />
              <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest">
                SECURE CHANNEL • SESSION AE-{id.slice(0, 6).toUpperCase()}
              </span>
            </div>
          </div>


          {/* Message List */}
          <div className="flex-grow overflow-y-auto p-5 flex flex-col gap-4 max-h-[450px]">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-on-surface-variant py-10 gap-2">
                <ShieldCheck size={28} className="text-primary/40" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Encrypted room opened</p>
                <p className="text-xs text-on-surface-variant max-w-[200px]">Send a greeting message to start matching coordinates.</p>
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
                    <span className="font-mono text-[9px] text-[#d0c5af] font-bold px-1.5 mb-1 uppercase tracking-wider">
                      {msg.displayName.split(" ")[0]}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-none text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-on-primary font-medium"
                        : "bg-surface-container-high border border-surface-variant text-on-surface"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="font-mono text-[8px] text-[#99907c] px-1 mt-1 uppercase">{ts}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input Panel */}
          <div className="border-t border-surface-variant p-4 flex gap-2.5 items-end bg-surface-container-low">
            {error && (
              <div className="absolute bottom-20 left-4 right-4 flex items-center gap-1.5 bg-[#93000a]/20 border border-[#93000a] text-[#ffb4ab] px-3 py-2 text-xs font-semibold">
                <AlertTriangle size={12} />
                {error}
              </div>
            )}
            <textarea
              className="flex-grow input resize-none py-2 text-sm leading-relaxed border-surface-variant"
              rows={1}
              placeholder={atLimit ? "Capacity reached" : "Say something..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              disabled={atLimit}


              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || atLimit || sending}
              className="w-10 h-10 flex-shrink-0 bg-primary text-[#3c2f00] hover:bg-[#ffe088] flex items-center justify-center transition-all disabled:opacity-40 focus:outline-none"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}

