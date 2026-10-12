/**
 * Placeholder yang menampilkan bentuk konten sebenarnya selagi data dimuat.
 *
 * Dipakai supaya transisi dari skeleton ke konten terasa "menempel", bukan
 * lompat Layout Shift — skeleton memakai tinggi yang sama dengan isi akhirnya.
 */

/** Deretan baris teks dengan lebar bervariasi. */
export function SkeletonLines({ count = 2 }: { count?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`skeleton skeleton-line ${i % 3 === 0 ? "is-mid" : i % 3 === 1 ? "" : "is-short"}`}
        />
      ))}
    </div>
  );
}

/** Kartu game dummy untuk skeleton katalog. */
export function GameGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="game-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <article className="game-card" key={i}>
          <span className="skeleton skeleton-block game-art" />
          <div className="game-info">
            <span className="skeleton skeleton-line is-short" />
            <span className="skeleton skeleton-line is-mid" />
          </div>
        </article>
      ))}
    </div>
  );
}

/** Baris komentar dummy. */
export function CommentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="comment-item" key={i}>
          <span className="skeleton skeleton-block comment-avatar" />
          <div style={{ flex: 1 }}>
            <span className="skeleton skeleton-line is-short" style={{ display: "block", marginBottom: 8 }} />
            <SkeletonLines count={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bubble pesan dummy untuk skeleton chat. */
export function ChatBubbleSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="chat-message" key={i}>
          <span className="skeleton skeleton-block chat-avatar" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="skeleton skeleton-line is-short" style={{ display: "block", marginBottom: 8 }} />
            <div className="chat-message-area">
              <SkeletonLines count={i % 2 === 0 ? 2 : 1} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Status "memuat" untuk teks pendek, menggantikan teks polos. */
export function InlineLoading({ label = "Memuat" }: { label?: string }) {
  return (
    <div className="inline-loading" role="status" aria-live="polite">
      <span className="inline-loading-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>{label}</span>
    </div>
  );
}