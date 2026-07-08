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

  // Load ride + check membership (only once)
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

  // Refresh my count only when messages length changes significantly
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
        <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-200">
          <Link href={`/rides/${id}`} className="p-1.5 border border-gray-250 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Ride Coordination Chat</span>
            <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
              {ride?.pickup} → {ride?.destination}
            </p>
          </div>
          <span className="text-[10px] bg-gray-150 border border-gray-250 text-gray-600 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
            {myCount} / {MESSAGE_LIMIT} msgs
          </span>
        </div>

        {/* Chat Window */}
        <div className="card flex flex-col bg-white border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden" style={{ minHeight: "65vh" }}>
          
          {/* Expiration disclaimer */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-brand-light/40 border-b border-brand/10 text-xs text-brand/70 font-medium">
            <Info size={14} className="mt-0.5 flex-shrink-0 text-brand" />
            <span>
              All message histories auto-expire after travel date. Personal information limits allow up to {MESSAGE_LIMIT} messages per rider.
            </span>
          </div>

          {/* Warnings */}
          {nearLimit && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-800 font-semibold">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
              <span>
                Nearing message thresholds. Exchanging contact handles is suggested.
              </span>
            </div>
          )}
          {atLimit && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border-b border-red-100 text-xs text-red-700 font-semibold">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
              <span>
                Message thresholds reached. Please coordinate via other offline methods.
              </span>
            </div>
          )}

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4" style={{ maxH: "450px" }}>
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-300 py-10 gap-2">
                <ShieldCheck size={28} className="text-gray-250" />
                <p className="text-xs font-semibold text-gray-400">Encrypted room opened</p>
                <p className="text-[10px] text-gray-400 max-w-[200px]">Send a greeting message to start matching coordinates.</p>
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
                    <span className="text-[10px] text-gray-400 font-bold px-1.5 mb-1">
                      {msg.displayName.split(" ")[0]}
                    </span>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-[16px] text-sm leading-relaxed ${
                      isMe
                        ? "bg-brand text-white rounded-br-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-gray-300 px-1 mt-1 font-semibold uppercase">{ts}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input Panel */}
          <div className="border-t border-gray-150 p-4 flex gap-2.5 items-end bg-gray-50/50">
            {error && (
              <div className="absolute bottom-20 left-4 right-4 flex items-center gap-1.5 bg-red-50 border border-red-150 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold">
                <AlertTriangle size={12} />
                {error}
              </div>
            )}
            <textarea
              className="flex-1 input resize-none py-2 text-sm leading-relaxed border-gray-200/80 bg-white"
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
              className="w-9 h-9 flex-shrink-0 bg-brand text-white rounded-lg flex items-center justify-center hover:bg-brand/90 transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] animate-in fade-in duration-75"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
