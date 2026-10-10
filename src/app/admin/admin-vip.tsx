"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Crown, LoaderCircle, Send, ShieldCheck, ShieldX, X } from "lucide-react";
import { VipBadge } from "@/components/vip-badge";
import { SiteFooter } from "@/components/site-footer";

type VipRequest = {
  id: string;
  user_id: string;
  username: string;
  duration_days: number;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  decided_at: string | null;
  created_at: string;
};

type VipSubscription = {
  user_id: string;
  started_at: string;
  expires_at: string;
  granted_by: string | null;
};

type VipMessage = {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  message: string;
  attachment_url: string | null;
  read_by_admin: boolean;
  created_at: string;
};

type VipPayload = {
  requests: VipRequest[];
  subscriptions: VipSubscription[];
  messages: VipMessage[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", year: "numeric" });
}

function daysLeft(expiresAt: string) {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

export default function AdminVip({ adminName }: { adminName: string }) {
  const [data, setData] = useState<VipPayload>({ requests: [], subscriptions: [], messages: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/vip", { cache: "no-store" });
      const result = (await response.json()) as VipPayload & { error?: string };
      if (!response.ok) {
        setErrorMessage(result.error ?? "Data VIP gagal dimuat.");
        return;
      }
      setData({ requests: result.requests ?? [], subscriptions: result.subscriptions ?? [], messages: result.messages ?? [] });
    } catch {
      setErrorMessage("Data VIP gagal dimuat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const activeMembers = useMemo(
    () => data.subscriptions.filter((row) => new Date(row.expires_at).getTime() > Date.now()),
    [data.subscriptions],
  );
  const pendingRequests = useMemo(() => data.requests.filter((row) => row.status === "pending"), [data.requests]);
  const decidedRequests = useMemo(() => data.requests.filter((row) => row.status !== "pending"), [data.requests]);

  // Riwayat chat dikelompokkan per user, yang punya pesan terbaru tampil lebih dulu.
  const conversations = useMemo(() => {
    const grouped = new Map<string, VipMessage[]>();
    for (const message of data.messages) {
      const list = grouped.get(message.user_id) ?? [];
      list.push(message);
      grouped.set(message.user_id, list);
    }
    return [...grouped.entries()]
      .map(([userId, list]) => ({ userId, messages: list.sort((a, b) => a.created_at.localeCompare(b.created_at)), latest: list[list.length - 1] }))
      .sort((a, b) => (b.latest?.created_at ?? "").localeCompare(a.latest?.created_at ?? ""));
  }, [data.messages]);

  const userName = useMemo(() => {
    const names = new Map<string, string>();
    for (const request of data.requests) names.set(request.user_id, request.username);
    for (const message of data.messages) if (!names.has(message.user_id)) names.set(message.user_id, message.user_id.slice(0, 12));
    return (userId: string) => names.get(userId) ?? userId.slice(0, 12);
  }, [data.requests, data.messages]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.userId === selectedUserId) ?? conversations[0] ?? null,
    [conversations, selectedUserId],
  );

  const runAction = async (action: string, userId: string, extra: Record<string, unknown> = {}) => {
    setBusyKey(`${action}-${userId}`);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/admin/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, ...extra }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string; expiresAt?: string } | null;
      if (!response.ok) {
        setErrorMessage(result?.error ?? "Aksi gagal.");
        return;
      }
      const labels: Record<string, string> = {
        activate: `VIP ${extra.durationDays ?? 7} hari diaktifkan.`,
        extend: `Masa VIP diperpanjang ${extra.durationDays ?? 7} hari.`,
        reject: "Pengajuan ditolak.",
        revoke: "Status VIP dibatalkan.",
        reply: "Balasan terkirim.",
      };
      setSuccessMessage(labels[action] ?? "Selesai.");
      await loadData();
    } catch {
      setErrorMessage("Aksi gagal. Coba lagi.");
    } finally {
      setBusyKey("");
    }
  };

  const sendReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeConversation || !replyText.trim()) return;
    await runAction("reply", activeConversation.userId, { message: replyText.trim() });
    setReplyText("");
  };

  const requestForUser = (userId: string) => pendingRequests.find((row) => row.user_id === userId);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-back" href="/admin"><ArrowLeft size={16} /> Kembali ke dashboard</Link>
        <div className="admin-heading-actions"><span className="admin-user">Masuk sebagai <strong>{adminName}</strong></span><button className="admin-add-button" onClick={() => void loadData()}><LoaderCircle size={15} /> Muat ulang</button></div>
      </header>

      <section className="admin-content">
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">LANGGANAN</span>
            <h1>VIP & chat admin</h1>
            <p>Periksa bukti transfer, aktifkan VIP, dan balas percakapan member.</p>
          </div>
          <div className="admin-heading-actions">
            <span className="admin-status"><span /> {activeMembers.length} MEMBER VIP</span>
          </div>
        </div>

        {errorMessage && <div className="admin-message error" role="alert">{errorMessage}</div>}
        {successMessage && <div className="admin-message success" role="status"><Check size={17} /> {successMessage}</div>}

        {isLoading ? <div className="admin-list-empty">Memuat data VIP...</div> : <>
          <section className="vip-admin-section">
            <div className="admin-list-toolbar"><div><h2>Menunggu verifikasi</h2><span>{pendingRequests.length} pengajuan</span></div></div>
            {pendingRequests.length === 0 ? <div className="admin-list-empty">Tidak ada pengajuan yang menunggu.</div> : <div className="vip-request-list">
              {pendingRequests.map((request) => (
                <article className="vip-request-row" key={request.id}>
                  <div className="vip-request-main">
                    <strong>{request.username}</strong>
                    <span>{request.duration_days} hari · diajukan {formatDateTime(request.created_at)}</span>
                    {request.note && <p>{request.note}</p>}
                  </div>
                  <div className="vip-request-actions">
                    <button onClick={() => void runAction("activate", request.user_id, { durationDays: request.duration_days, requestId: request.id })} disabled={busyKey === `activate-${request.user_id}`}>
                      {busyKey === `activate-${request.user_id}` ? <LoaderCircle className="admin-spinner" size={14} /> : <Check size={14} />} Aktifkan {request.duration_days} hari
                    </button>
                    <button className="danger" onClick={() => void runAction("reject", request.user_id, { requestId: request.id })} disabled={busyKey === `reject-${request.user_id}`}><X size={14} /> Tolak</button>
                  </div>
                </article>
              ))}
            </div>}
          </section>

          <section className="vip-admin-section">
            <div className="admin-list-toolbar"><div><h2>Member VIP</h2><span>{activeMembers.length} sedang aktif</span></div></div>
            {activeMembers.length === 0 ? <div className="admin-list-empty">Belum ada member VIP aktif.</div> : <div className="vip-member-list">
              {activeMembers.map((member) => (
                <article className="vip-member-row" key={member.user_id}>
                  <div className="vip-request-main">
                    <strong>{userName(member.user_id)} <VipBadge /></strong>
                    <span>aktif sampai {formatDate(member.expires_at)} · sisa {daysLeft(member.expires_at)} hari</span>
                  </div>
                  <div className="vip-request-actions">
                    <button onClick={() => void runAction("extend", member.user_id, { durationDays: 7 })} disabled={busyKey === `extend-${member.user_id}`}><Check size={14} /> Perpanjang 7 hari</button>
                    <button className="danger" onClick={() => void runAction("revoke", member.user_id)} disabled={busyKey === `revoke-${member.user_id}`}><ShieldX size={14} /> Batalkan</button>
                  </div>
                </article>
              ))}
            </div>}
          </section>

          <section className="vip-admin-section">
            <div className="admin-list-toolbar"><div><h2>Chat dengan member</h2><span>{conversations.length} percakapan</span></div></div>
            {conversations.length === 0 ? <div className="admin-list-empty">Belum ada percakapan dari member.</div> : <div className="vip-admin-chat">
              <div className="vip-conversation-list">
                {conversations.map((conversation) => {
                  const pending = requestForUser(conversation.userId);
                  return (
                    <button key={conversation.userId} className={activeConversation?.userId === conversation.userId ? "is-active" : ""} onClick={() => setSelectedUserId(conversation.userId)}>
                      <strong>{userName(conversation.userId)} {activeMembers.some((member) => member.user_id === conversation.userId) && <VipBadge />}</strong>
                      <span>{conversation.latest?.message.slice(0, 42) ?? "-"}</span>
                      <small>{formatDateTime(conversation.latest?.created_at ?? new Date().toISOString())}{pending ? " · menunggu" : ""}</small>
                    </button>
                  );
                })}
              </div>

              {activeConversation && <div className="vip-conversation-panel">
                <div className="vip-conversation-head">
                  <div><strong>{userName(activeConversation.userId)}</strong><span>{activeConversation.userId}</span></div>
                  {!activeMembers.some((member) => member.user_id === activeConversation.userId) && <button onClick={() => void runAction("activate", activeConversation.userId, { durationDays: 7 })} disabled={Boolean(busyKey)}><Crown size={14} /> Aktifkan VIP 7 hari</button>}
                </div>
                <div className="vip-conversation-messages">
                  {activeConversation.messages.map((message) => (
                    <div className={message.sender === "admin" ? "vip-message is-admin" : "vip-message is-user"} key={message.id}>
                      <span className="vip-message-sender">{message.sender === "admin" ? <><ShieldCheck size={13} /> Admin</> : userName(message.user_id)}</span>
                      <div className="vip-message-bubble">
                        {message.attachment_url && <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="vip-message-proof"><img src={message.attachment_url} alt="Bukti transfer" /></a>}
                        {message.message && <p>{message.message}</p>}
                      </div>
                      <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
                    </div>
                  ))}
                </div>
                <form className="vip-conversation-form" onSubmit={sendReply}>
                  <input value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="Tulis balasan untuk member..." aria-label="Tulis balasan" maxLength={2000} />
                  <button type="submit" disabled={!replyText.trim() || Boolean(busyKey)} aria-label="Kirim balasan"><Send size={16} /></button>
                </form>
              </div>}
            </div>}
          </section>

          {decidedRequests.length > 0 && <section className="vip-admin-section">
            <div className="admin-list-toolbar"><div><h2>Riwayat pengajuan</h2><span>{decidedRequests.length} selesai</span></div></div>
            <div className="vip-history-list">
              {decidedRequests.map((request) => (
                <div className="vip-history-row" key={request.id}>
                  <strong>{request.username}</strong>
                  <span>{request.duration_days} hari</span>
                  <em className={request.status === "approved" ? "ok" : "no"}>{request.status === "approved" ? "Disetujui" : "Ditolak"}</em>
                  <small>{formatDateTime(request.created_at)}</small>
                </div>
              ))}
            </div>
          </section>}
        </>}
      </section>
      <SiteFooter />
    </main>
  );
}