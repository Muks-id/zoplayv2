"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ChevronDown, CornerDownRight, LoaderCircle, MessageCircle, Reply, Send, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { VipBadge } from "@/components/vip-badge";
import { tierStyle } from "@/lib/tier-style";
import { isRecord, isStringArray, isStringRecord } from "@/lib/utils";

type GameComment = {
  id: string;
  parent_id: string | null;
  /** Null untuk komentar Anonim, sehingga tidak bisa memakai lencana VIP. */
  user_id: string | null;
  author_name: string;
  comment_text: string;
  created_at: string;
};

type CommentMode = "google" | "anonymous";

/** Komentar yang sedang dibalas: rootId = komentar utama, authorName = nama yang dibalas. */
type ReplyTarget = { rootId: string; commentId: string; authorName: string };

const COMMENT_FIELDS = "id, parent_id, user_id, author_name, comment_text, created_at";
// Dipakai jika migration 007 (kolom parent_id) belum dijalankan.
const LEGACY_COMMENT_FIELDS = "id, user_id, author_name, comment_text, created_at";
const MISSING_COLUMN_ERROR = "42703";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function CommentsSection({ gameId }: { gameId?: string }) {
  const { user, isLoaded } = useUser();
  const [mode, setMode] = useState<CommentMode>("google");
  const [anonymousName, setAnonymousName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<string[]>([]);
  const [comments, setComments] = useState<GameComment[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(gameId));
  const [sendingTarget, setSendingTarget] = useState<"comment" | "reply" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Hanya akun admin yang boleh menghapus komentar; dicek ulang di server.
  const isAdmin = user?.publicMetadata?.role === "admin";
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const deleteComment = async (commentId: string) => {
    if (!isAdmin || deletingCommentId) return;
    if (!window.confirm("Hapus komentar ini? Balasan di dalamnya juga akan ikut terhapus.")) return;
    setDeletingCommentId(commentId);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "comment", id: commentId }),
      });
      if (!res.ok) {
        const result: unknown = await res.json().catch(() => null);
        throw new Error(isRecord(result) && typeof result.error === "string" ? result.error : "Gagal menghapus komentar.");
      }
      // Balasan ikut terhapus lewat ON DELETE CASCADE, jadi ikut dibuang di sisi klien.
      const removed = new Set<string>([commentId]);
      for (const item of comments) {
        if (item.parent_id === commentId) removed.add(item.id);
      }
      setComments((current) => current.filter((item) => !removed.has(item.id)));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal menghapus komentar.");
    } finally {
      setDeletingCommentId(null);
    }
  };
  const [replyErrorMessage, setReplyErrorMessage] = useState("");
  const [repliesSupported, setRepliesSupported] = useState(true);
  const [vipAuthorIds, setVipAuthorIds] = useState<Set<string>>(new Set());
  const [authorTiers, setAuthorTiers] = useState<Record<string, string>>({});
  const [adminAuthorIds, setAdminAuthorIds] = useState<Set<string>>(new Set());
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const googleAuthorName = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress.split("@")[0] || "Player";

  const loadComments = useCallback(async () => {
    if (!gameId || !supabase) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const fetchComments = (fields: string) => supabase!
      .from("comments")
      .select(fields)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false });

    let { data, error } = await fetchComments(COMMENT_FIELDS);
    if (error?.code === MISSING_COLUMN_ERROR) {
      setRepliesSupported(false);
      ({ data, error } = await fetchComments(LEGACY_COMMENT_FIELDS));
    }
    if (error) setErrorMessage("Komentar belum dapat dimuat. Pastikan migration komentar sudah dijalankan.");
    else setComments(((data ?? []) as unknown as Omit<GameComment, "parent_id">[]).map((comment) => ({ parent_id: null, ...comment })));
    setIsLoading(false);
  }, [gameId]);

  // Daftar user yang sedang jadi VIP, diambil dari server supaya lencana
  // mengikuti status langganan terbaru.
  useEffect(() => {
    const ids = [...new Set(comments.map((comment) => comment.user_id).filter((id): id is string => Boolean(id)))];
    if (!ids.length) {
      setVipAuthorIds(new Set());
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
        if (!cancelled) setVipAuthorIds(new Set(vipIds ?? []));
      })
      .catch(() => { if (!cancelled) setVipAuthorIds(new Set()); });
    return () => { cancelled = true; };
  }, [comments]);

  // Tier title di samping nama, dibaca dari profil user.
  useEffect(() => {
    const ids = [...new Set(comments.map((comment) => comment.user_id).filter((id): id is string => Boolean(id)))];
    if (!ids.length) {
      setAuthorTiers({});
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
          setAuthorTiers(result?.tiers ?? {});
          setAdminAuthorIds(new Set(result?.admins ?? []));
        }
      })
      .catch(() => { if (!cancelled) { setAuthorTiers({}); setAdminAuthorIds(new Set()); } });
    return () => { cancelled = true; };
  }, [comments]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  // Komentar utama: terbaru di atas. Balasan: urut dari yang paling lama agar percakapan terbaca runtut.
  const { topLevelComments, repliesByParent } = useMemo(() => {
    const ids = new Set(comments.map((comment) => comment.id));
    const replies = new Map<string, GameComment[]>();
    const topLevel: GameComment[] = [];
    for (const comment of comments) {
      if (comment.parent_id && ids.has(comment.parent_id)) {
        const list = replies.get(comment.parent_id) ?? [];
        list.push(comment);
        replies.set(comment.parent_id, list);
      } else {
        topLevel.push(comment);
      }
    }
    replies.forEach((list) => list.sort((a, b) => a.created_at.localeCompare(b.created_at)));
    return { topLevelComments: topLevel, repliesByParent: replies };
  }, [comments]);

  useEffect(() => {
    if (replyTarget) replyInputRef.current?.focus();
  }, [replyTarget]);

  const toggleThread = (commentId: string) => {
    setExpandedThreads((current) => current.includes(commentId) ? current.filter((id) => id !== commentId) : [...current, commentId]);
  };

  const startReply = (rootId: string, comment: GameComment) => {
    setReplyTarget({ rootId, commentId: comment.id, authorName: comment.author_name });
    setReplyErrorMessage("");
    // Membalas sebuah balasan: sebut namanya agar jelas siapa yang dibalas.
    setReplyText(comment.parent_id ? `@${comment.author_name} ` : "");
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setReplyText("");
    setReplyErrorMessage("");
  };

  const postComment = async (text: string, parentId: string | null, setError: (message: string) => void) => {
    setError("");
    if (!gameId || !supabase) {
      setError("Komentar hanya tersedia untuk game yang sudah tersimpan di database.");
      return null;
    }
    if (mode === "google" && !user) {
      setError("Masuk terlebih dahulu untuk mengirim komentar.");
      return null;
    }

    const authorName = mode === "anonymous" ? anonymousName.trim() : googleAuthorName;
    const trimmedText = text.trim();
    if (!authorName || !trimmedText) {
      setError("Nama dan komentar harus diisi.");
      return null;
    }

    const { data, error } = await supabase
      .from("comments")
      // Komentar Anonim tidak dikaitkan ke akun, jadi tidak bisa memakai lencana VIP.
      .insert({ game_id: gameId, user_id: mode === "google" ? (user?.id ?? null) : null, author_name: authorName, comment_text: trimmedText, ...(parentId ? { parent_id: parentId } : {}) })
      .select(repliesSupported ? COMMENT_FIELDS : LEGACY_COMMENT_FIELDS)
      .single();

    if (error) {
      setError(error.code === MISSING_COLUMN_ERROR
        ? "Fitur balasan belum aktif. Jalankan migration 007_comment_replies.sql di Supabase."
        : "Komentar gagal dikirim. Periksa migration dan kebijakan akses Supabase.");
      return null;
    }
    const saved = { parent_id: null, ...(data as unknown as Omit<GameComment, "parent_id">) } as GameComment;
    setComments((current) => [saved, ...current]);
    return saved;
  };

  const submitComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSendingTarget("comment");
    const saved = await postComment(commentText, null, setErrorMessage);
    if (saved) setCommentText("");
    setSendingTarget(null);
  };

  const submitReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replyTarget) return;
    setSendingTarget("reply");
    const saved = await postComment(replyText, replyTarget.rootId, setReplyErrorMessage);
    if (saved) {
      setExpandedThreads((current) => current.includes(replyTarget.rootId) ? current : [...current, replyTarget.rootId]);
      cancelReply();
    }
    setSendingTarget(null);
  };

  const modeTabs = (
    <div className="comment-mode" role="tablist" aria-label="Cara berkomentar">
      <button type="button" role="tab" aria-selected={mode === "google"} className={mode === "google" ? "selected" : ""} onClick={() => { setMode("google"); setErrorMessage(""); setReplyErrorMessage(""); }}>Akun ZOPLAY</button>
      <button type="button" role="tab" aria-selected={mode === "anonymous"} className={mode === "anonymous" ? "selected" : ""} onClick={() => { setMode("anonymous"); setErrorMessage(""); setReplyErrorMessage(""); }}>Anonim</button>
    </div>
  );

  const authorField = mode === "anonymous"
    ? <label className="comment-name-field"><span>Nama panggilan</span><input value={anonymousName} onChange={(event) => setAnonymousName(event.target.value)} maxLength={80} required placeholder="Tulis nama yang akan tampil" /></label>
    : <div className="comment-author-hint">{user ? `Berkomentar sebagai ${googleAuthorName}` : "Masuk untuk berkomentar menggunakan akunmu"}</div>;

  const googlePrompt = <>
    {mode === "google" && isLoaded && !user && <div className="google-comment-prompt"><p>Masuk untuk mengirim komentar menggunakan nama akunmu.</p><SignInButton><button type="button" className="google-comment-button">Masuk / daftar</button></SignInButton></div>}
  </>;

  const renderReplyForm = (rootId: string) => {
    if (replyTarget?.rootId !== rootId) return null;
    return (
      <form className="comment-form comment-reply-form" onSubmit={submitReply}>
        <div className="comment-reply-heading">
          <span><CornerDownRight size={13} /> Membalas <strong>{replyTarget.authorName}</strong></span>
          <button type="button" className="comment-reply-cancel" aria-label="Batal membalas" onClick={cancelReply}><X size={14} /></button>
        </div>
        {modeTabs}
        {googlePrompt}
        {authorField}
        <label className="comment-text-field"><span className="sr-only">Tulis balasan</span><textarea ref={replyInputRef} value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={3000} rows={3} required placeholder={`Balas ${replyTarget.authorName}...`} /></label>
        {replyErrorMessage && <p className="comment-error" role="alert">{replyErrorMessage}</p>}
        <div className="comment-submit-row">
          <small>{replyText.length}/3000</small>
          <div className="comment-submit-actions">
            <button type="button" className="comment-cancel-button" onClick={cancelReply}>Batal</button>
            <button type="submit" disabled={sendingTarget === "reply" || (mode === "google" && !user)}>{sendingTarget === "reply" ? <LoaderCircle className="admin-spinner" size={15} /> : <Send size={15} />} Kirim balasan</button>
          </div>
        </div>
      </form>
    );
  };

  const renderComment = (comment: GameComment, rootId: string, isReply: boolean) => (
    <article className={isReply ? "comment-item comment-reply-item" : "comment-item"} key={comment.id}>
      <div className="comment-avatar">{comment.author_name.slice(0, 1).toUpperCase()}</div>
      <div>
        <div className="comment-meta"><strong>{comment.author_name}</strong>{comment.user_id && vipAuthorIds.has(comment.user_id) && <VipBadge />}{comment.user_id && adminAuthorIds.has(comment.user_id) && <span className="admin-badge">Admin</span>}{comment.user_id && authorTiers[comment.user_id] && <span className="tier-badge" style={tierStyle(authorTiers[comment.user_id])}>{authorTiers[comment.user_id]}</span>}<time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time></div>
        <p>{comment.comment_text}</p>
        {(repliesSupported || isAdmin) && <div className="comment-actions">
          {repliesSupported && <button type="button" className={replyTarget?.commentId === comment.id ? "active" : ""} onClick={() => replyTarget?.commentId === comment.id ? cancelReply() : startReply(rootId, comment)}><Reply size={13} /> Balas</button>}
          {isAdmin && <button type="button" className="comment-delete" aria-label={`Hapus komentar dari ${comment.author_name}`} onClick={() => void deleteComment(comment.id)} disabled={deletingCommentId === comment.id}><Trash2 size={13} className={deletingCommentId === comment.id ? "is-busy" : undefined} /> Hapus</button>}
        </div>}
      </div>
    </article>
  );

  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <div className="comments-heading"><div><span className="section-label">KOMUNITAS</span><h2 id="comments-title">Komentar <span>{comments.length}</span></h2></div><MessageCircle size={20} /></div>
      {!gameId ? <div className="comments-notice">Komentar akan tersedia setelah game ini disimpan di Supabase.</div> : <>
        <div className="comment-list" aria-live="polite">
          {isLoading ? <div className="comments-notice">Memuat komentar...</div> : topLevelComments.length ? topLevelComments.map((comment) => {
            const replies = repliesByParent.get(comment.id) ?? [];
            const expanded = expandedThreads.includes(comment.id);
            return (
              <div className="comment-thread" key={comment.id}>
                {renderComment(comment, comment.id, false)}
                {replies.length > 0 && (
                  <button type="button" className="comment-toggle-replies" aria-expanded={expanded} aria-controls={`replies-${comment.id}`} onClick={() => toggleThread(comment.id)}>
                    <ChevronDown size={14} className={expanded ? "chevron open" : "chevron"} />
                    {expanded ? "Sembunyikan balasan" : `Tampilkan ${replies.length} balasan`}
                  </button>
                )}
                {expanded && replies.length > 0 && (
                  <div className="comment-replies" id={`replies-${comment.id}`}>
                    {replies.map((reply) => renderComment(reply, comment.id, true))}
                  </div>
                )}
                {renderReplyForm(comment.id)}
              </div>
            );
          }) : <div className="comments-notice">Belum ada komentar. Jadilah yang pertama.</div>}
        </div>

        {modeTabs}
        {googlePrompt}

        <form className="comment-form" onSubmit={submitComment}>
          {authorField}
          <label className="comment-text-field"><span>Tulis komentar</span><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={3000} rows={4} required placeholder="Bagikan pendapatmu tentang game ini..." /></label>
          {errorMessage && <p className="comment-error" role="alert">{errorMessage}</p>}
          <div className="comment-submit-row"><small>{commentText.length}/3000</small><button type="submit" disabled={sendingTarget === "comment" || (mode === "google" && !user)}>{sendingTarget === "comment" ? <LoaderCircle className="admin-spinner" size={15} /> : <Send size={15} />} Kirim komentar</button></div>
        </form>
      </>}
    </section>
  );
}
