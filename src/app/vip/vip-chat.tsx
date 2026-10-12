"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { VIP_DURATIONS, VIP_PRICES } from "@/lib/vip-shared";

type VipMessage = {
  id: string;
  sender: "user" | "admin";
  message: string;
  attachment_url: string | null;
  created_at: string;
};

const POLL_MS = 5000;

function formatTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

export default function VipChat({ displayName }: { displayName: string }) {
  const [messages, setMessages] = useState<VipMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState("");
  const [duration, setDuration] = useState<number>(7);
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/vip?action=messages", { cache: "no-store" });
      if (!response.ok) return;
      const result = (await response.json()) as { messages?: VipMessage[] };
      setMessages(result.messages ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
    const interval = window.setInterval(loadMessages, POLL_MS);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Pratinjau bukti dibuat dari file lokal lalu dicabut lagi agar tidak ada memory leak.
  useEffect(() => {
    if (!proof) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proof);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proof]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>, withRequest: boolean) => {
    event.preventDefault();
    if (isSending) return;
    if (!text.trim() && !proof) {
      setErrorMessage("Tulis pesan atau lampirkan bukti transfer.");
      return;
    }

    setIsSending(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const formData = new FormData();
      formData.set("message", text.trim());
      if (proof) formData.set("proof", proof);
      if (withRequest) formData.set("durationDays", String(duration));

      const response = await fetch("/api/vip", { method: "POST", body: formData });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setErrorMessage(result?.error ?? "Pesan gagal dikirim.");
        return;
      }

      setText("");
      setProof(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (withRequest) {
        setSuccessMessage(`Pengajuan VIP ${duration} hari terkirim ke admin.`);
        setDuration(7);
      }
      await loadMessages();
    } catch {
      setErrorMessage("Pesan gagal dikirim. Coba lagi.");
    } finally {
      setIsSending(false);
      setIsRequesting(false);
    }
  };

  

  return (
    <section className="vip-chat" aria-labelledby="vip-chat-title">
      <div className="vip-chat-heading">
        <div><span className="section-label">BANTUAN</span><h2 id="vip-chat-title">Chat dengan admin</h2></div>
        <span className="vip-chat-user">Login sebagai <strong>{displayName}</strong></span>
      </div>

      <div className="vip-chat-box">
        <div className="vip-chat-messages" aria-live="polite">
          {isLoading ? <p className="chat-empty">Memuat percakapan...</p> : messages.length === 0 ? (
            <div className="chat-empty">
              <Sparkles size={26} />
              <p>Belum ada percakapan. Kirim pertanyaan atau bukti transfer di sini.</p>
            </div>
          ) : messages.map((message) => (
            <div className={message.sender === "admin" ? "vip-message is-admin" : "vip-message is-user"} key={message.id}>
              <span className="vip-message-sender">{message.sender === "admin" ? <><ShieldCheck size={13} /> Admin</> : displayName}</span>
              <div className="vip-message-bubble">
                {message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="vip-message-proof"><img src={message.attachment_url} alt="Bukti transfer" /></a>}
                {message.message && <p>{message.message}</p>}
              </div>
              <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="vip-request-bar">
          <label>
            <span>Durasi</span>
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {VIP_DURATIONS.map((days) => <option value={days} key={days}>{days} hari — Rp{VIP_PRICES[days].toLocaleString("id-ID")}</option>)}
            </select>
          </label>
          <button type="button" className="primary-button vip-request-button" onClick={(event) => { const form = event.currentTarget.form; if (form) form.requestSubmit(); }} disabled={isRequesting || isSending}>
            {isRequesting ? <LoaderCircle className="admin-spinner" size={15} /> : <Sparkles size={15} />} Ajukan Langganan
          </button>
        </div>

        <form className="vip-chat-form" onSubmit={(event) => void sendMessage(event, false)}>
          {proofPreview && <div className="vip-proof-preview"><img src={proofPreview} alt="Pratinjau bukti" /><button type="button" aria-label="Hapus bukti" onClick={() => { setProof(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}><X size={14} /></button></div>}
          <div className="vip-chat-row">
            <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileInputRef} className="sr-only" onChange={(event) => setProof(event.target.files?.[0] ?? null)} />
            <button type="button" aria-label="Lampirkan bukti transfer" title="Lampirkan bukti transfer" onClick={() => fileInputRef.current?.click()}><ImagePlus size={18} /></button>
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Tulis pesan atau catatan untuk admin..." aria-label="Tulis pesan" maxLength={2000} />
            <button type="submit" disabled={isSending || (!text.trim() && !proof)} aria-label="Kirim pesan">
              {isSending ? <LoaderCircle className="admin-spinner" size={17} /> : <Send size={17} />}
            </button>
          </div>
          {errorMessage && <p className="comment-error" role="alert">{errorMessage}</p>}
          {successMessage && <p className="vip-success" role="status">{successMessage}</p>}
          <small className="vip-chat-hint">Bukti transfer berupa gambar (JPG, PNG, atau WebP) maksimal 5 MB.</small>
        </form>
      </div>
    </section>
  );
}