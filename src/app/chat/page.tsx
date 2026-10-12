"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, MessageCircle, Reply, Send, Trash2, Users } from "lucide-react";
import { SiteNavigation } from "@/components/site-navigation";
import { SiteFooter } from "@/components/site-footer";
import { VipBadge } from "@/components/vip-badge";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { CHAT_MESSAGE_EMOJIS, type ChatReaction } from "@/lib/chat-emojis";
import { tierStyle } from "@/lib/tier-style";
import { isRecord, isStringArray, isStringRecord } from "@/lib/utils";

type ChatMessage = {
  id: string;
  user_id: string;
  username: string;
  message: string;
  reply_to_id: string | null;
  created_at: string;
  reactions?: ChatReaction[];
};

function isChatMessage(value: unknown): value is ChatMessage {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.user_id === "string"
    && typeof value.username === "string"
    && typeof value.message === "string"
    && (typeof value.reply_to_id === "string" || value.reply_to_id === null)
    && typeof value.created_at === "string";
}

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [vipUserIds, setVipUserIds] = useState<Set<string>>(new Set());
  const [userTiers, setUserTiers] = useState<Record<string, string>>({});
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const res = await fetch("/api/public-chat");
        const data: unknown = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(isRecord(data) && typeof data.error === "string" ? data.error : "Gagal memuat chat.");
        } else if (isRecord(data) && Array.isArray(data.messages)) {
          setMessages(data.messages.filter(isChatMessage));
        }
      } catch {
        if (!cancelled) setError("Gagal memuat chat.");
      }
      if (!cancelled) setLoading(false);
    };

    void loadMessages();
    // Polling tiap 5 detik agar pesan baru muncul tanpa refresh
    const interval = setInterval(loadMessages, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Lencana VIP di chat mengikuti status langganan terbaru dari server.
  useEffect(() => {
    const ids = [...new Set(messages.map((message) => message.user_id).filter(Boolean))];
    if (!ids.length) {
      setVipUserIds(new Set());
      return;
    }
    let cancelled = false;
    fetch("/api/vip/badges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: ids }) })
      .then(async (response) => {
        if (!response.ok) return null;
        const result: unknown = await response.json();
        return isRecord(result) && isStringArray(result.vipUserIds) ? result.vipUserIds : null;
      })
      .then((vipIds) => {
        if (!cancelled) setVipUserIds(new Set(vipIds ?? []));
      })
      .catch(() => { if (!cancelled) setVipUserIds(new Set()); });
    return () => { cancelled = true; };
  }, [messages]);

  // Tier title di samping nama, dibaca dari profil user.
  useEffect(() => {
    const ids = [...new Set(messages.map((message) => message.user_id).filter(Boolean))];
    if (!ids.length) {
      setUserTiers({});
      return;
    }
    let cancelled = false;
    fetch("/api/profiles/tiers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: ids }) })
      .then(async (response) => {
        if (!response.ok) return null;
        const result: unknown = await response.json();
        if (!isRecord(result)) return null;
        return {
          tiers: isStringRecord(result.tiers) ? result.tiers : {},
          admins: isStringArray(result.admins) ? result.admins : [],
        };
      })
      .then((result) => {
        if (!cancelled) {
          setUserTiers(result?.tiers ?? {});
          setAdminIds(new Set(result?.admins ?? []));
        }
      })
      .catch(() => { if (!cancelled) { setUserTiers({}); setAdminIds(new Set()); } });
    return () => { cancelled = true; };
  }, [messages]);

  const lastMessageByUser = useMemo(() => {
    const map = new Map<string, number>();
    for (const message of messages) map.set(message.user_id, new Date(message.created_at).getTime());
    return map;
  }, [messages]);

  // Hanya akun admin (publicMetadata.role) yang boleh menghapus pesan.
  // Otorisasi sesungguhnya dicek ulang di /api/admin/delete.
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMessage = async (messageId: string) => {
    if (!isAdmin || deletingId) return;
    setDeletingId(messageId);
    setError(null);
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "chat", id: messageId }),
      });
      if (!res.ok) {
        const result: unknown = await res.json().catch(() => null);
        throw new Error(isRecord(result) && typeof result.error === "string" ? result.error : "Gagal menghapus pesan.");
      }
      // Hapus langsung dari daftar; polling berikutnya akan mengonfirmasi ke server.
      setMessages((current) => current.filter((message) => message.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus pesan.");
    } finally {
      setDeletingId(null);
    }
  };

  const onlineCount = useMemo(() => {
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    let count = 0;
    lastMessageByUser.forEach((time) => {
      if (time >= twoMinutesAgo) count += 1;
    });
    return count;
  }, [lastMessageByUser]);

  return (
    <>
      {/* Navbar berada di luar .chat-page supaya lebarnya tetap penuh,
        sama seperti di halaman home dan profile. */}
      <SiteNavigation currentPage="chat" />
      <div className="chat-page">
      <div className="chat-header">
        <div className="chat-header-text">
          <h1 className="chat-seg chat-seg-title">Chat</h1>
        </div>
        <div className="chat-online-badge">
          <Users size={15} />
          <span>{onlineCount} aktif baru-baru ini</span>
        </div>
      </div>

      <div className="chat-box">
        <div className="chat-messages">
          {loading ? (
            <p className="chat-empty">Memuat chat...</p>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <MessageCircle size={28} />
              <p>Belum ada pesan. Jadi yang pertama!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div className={`${message.reply_to_id ? "chat-message is-reply" : "chat-message"}${user?.id === message.user_id ? " is-own" : ""}`} key={message.id}>
                <span className="chat-avatar">{message.username.slice(0, 2).toUpperCase()}</span>
                <div className="chat-bubble">
                  <div className="chat-badges">
                    {adminIds.has(message.user_id) && <span className="admin-badge">Admin</span>}
                    {userTiers[message.user_id] && <span className="tier-badge" style={tierStyle(userTiers[message.user_id])}>{userTiers[message.user_id]}</span>}
                    {vipUserIds.has(message.user_id) && <VipBadge />}
                  </div>
                  <div className="chat-username">{message.username}</div>
                  {(() => {
                    const target = message.reply_to_id ? messageById.get(message.reply_to_id) : null;
                    if (!target) return null;
                    return (
                      <div className="chat-reply-quote">
                        <span>{target.username}</span>
                        <p>{target.message}</p>
                      </div>
                    );
                  })()}
                  <div className="chat-message-area">
                    <p>{message.message}</p>
                    {isAdmin && (
                      <button
                        type="button"
                        className="chat-delete"
                        aria-label={`Hapus pesan dari ${message.username}`}
                        title="Hapus pesan"
                        onClick={() => void deleteMessage(message.id)}
                        disabled={deletingId === message.id}
                      >
                        <Trash2 size={13} className={deletingId === message.id ? "is-busy" : undefined} />
                      </button>
                    )}
                  </div>
                  <div className="chat-footer">
                    {user?.id === message.user_id ? (
                      <>
                        <div className="chat-footer-reply">
                          <button type="button" className="chat-reply-pill" aria-label={`Balas pesan ${message.username}`} onClick={() => setReplyTo(message)}>
                            <Reply size={12} /> Reply
                          </button>
                        </div>
                        <div className="chat-footer-time">
                          <span className="chat-footer-divider" />
                          <Clock3 size={11} />
                          <time>{new Date(message.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</time>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="chat-footer-time">
                          <Clock3 size={11} />
                          <time>{new Date(message.created_at).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</time>
                        </div>
                        <div className="chat-footer-reply">
                          <span className="chat-footer-divider" />
                          <button type="button" className="chat-reply-pill" aria-label={`Balas pesan ${message.username}`} onClick={() => setReplyTo(message)}>
                            <Reply size={12} /> Reply
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <SignedIn>
          <ChatComposer
            profile={profile}
            setProfile={setProfile}
            sending={sending}
            setSending={setSending}
            input={input}
            setInput={setInput}
            setError={setError}
            setMessages={setMessages}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
          />
        </SignedIn>
        <SignedOut>
          <div className="chat-signin-notice">
            <p>Untuk mengirim pesan, kamu harus masuk terlebih dahulu.</p>
            <SignInButton mode="modal">
              <button className="chat-signin-button">Masuk sekarang <ArrowRight size={15} /></button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>

      {error && <p className="chat-error">{error}</p>}

      <Link className="chat-back" href="/">Kembali ke beranda <ArrowRight size={14} /></Link>
      </div>
      <SiteFooter />
    </>
  );
}

function ChatComposer({
  profile,
  setProfile,
  sending,
  setSending,
  input,
  setInput,
  setError,
  setMessages,
  replyTo,
  setReplyTo,
}: {
  profile: { id: string; name: string } | null;
  setProfile: (profile: { id: string; name: string }) => void;
  sending: boolean;
  setSending: (value: boolean) => void;
  input: string;
  setInput: (value: string) => void;
  setError: (value: string | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  replyTo: ChatMessage | null;
  setReplyTo: (value: ChatMessage | null) => void;
}) {
  const { user, isLoaded } = useUserSafe();
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    if (!user || profile) return;
    const name = user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "Anonim";
    setProfile({ id: user.id, name });
  }, [user, profile, setProfile]);

  const send = async () => {
    if (!profile) return;
    const message = input.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, replyToId: replyTo?.id ?? null }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        setError(isRecord(data) && typeof data.error === "string" ? data.error : "Gagal mengirim pesan. Coba lagi.");
      } else {
        setInput("");
        setReplyTo(null);
        const newMessage = isRecord(data) ? data.message : null;
        if (isChatMessage(newMessage)) {
          setMessages((current) =>
            current.some((item) => item.id === newMessage.id) ? current : [...current, newMessage],
          );
        }
      }
    } catch {
      setError("Gagal mengirim pesan. Coba lagi.");
    }
    setSending(false);
  };

  if (!isLoaded) return null;

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      {replyTo && (
        <div className="chat-reply-preview">
          <span>Membalas {replyTo.username}</span>
          <p>{replyTo.message}</p>
          <button type="button" aria-label="Batal membalas" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}
      <div className="chat-composer-row">
        <div className="reaction-picker">
          <button
            type="button"
            className="chat-emoji-btn"
            aria-label="Sisipkan emoji"
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen((value) => !value)}
          >
            😀
          </button>
          {emojiOpen && (
            <div className="reaction-picker-menu" onMouseLeave={() => setEmojiOpen(false)}>
              {CHAT_MESSAGE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setInput(input.length < 500 ? `${input}${emoji}`.slice(0, 500) : input);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tulis pesan..."
          maxLength={500}
          aria-label="Tulis pesan"
        />
        <button type="submit" disabled={sending || !input.trim()} aria-label="Kirim pesan">
          <Send size={17} />
        </button>
      </div>
    </form>
  );
}

function useUserSafe() {
  return useUser();
}
