"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Crown, LoaderCircle, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

type DownloadPlatform = "windows" | "android";
type AdminDownloadVersion = {
  id: string;
  version_label: string;
  download_links: { id: string; platform: DownloadPlatform; server_name: string; destination_url: string }[];
};
type VersionField = { key: string; label: string };
type AdminGame = {
  id: string;
  slug: string;
  title: string;
  thumbnail: string | null;
  description: string;
  developer: string | null;
  release_date: string | null;
  file_size: string | null;
  is_featured: boolean;
  is_18_plus: boolean;
  category: { name: string } | { name: string }[] | null;
  game_galleries: { id: string; image_url: string }[];
  game_download_versions: AdminDownloadVersion[];
};

export default function AdminGameForm({ adminName, vipMemberCount = 0 }: { adminName: string; vipMemberCount?: number }) {
  const [games, setGames] = useState<AdminGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<AdminGame | null>(null);
  const [activeView, setActiveView] = useState<"list" | "form">("list");
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successTitle, setSuccessTitle] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [versionFields, setVersionFields] = useState<VersionField[]>([{ key: "new-version-1", label: "Versi 1" }]);

  const loadGames = async () => {
    setIsLoadingGames(true);
    try {
      const response = await fetch("/api/admin/games", { cache: "no-store" });
      const result = await response.json() as AdminGame[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) {
        throw new Error("error" in result ? result.error ?? "Daftar game gagal dimuat." : "Daftar game gagal dimuat.");
      }
      setGames(result);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Daftar game gagal dimuat.");
    } finally {
      setIsLoadingGames(false);
    }
  };

  useEffect(() => { void loadGames(); }, []);

  const getCategoryName = (game: AdminGame) => Array.isArray(game.category) ? game.category[0]?.name ?? "Lainnya" : game.category?.name ?? "Lainnya";

  const toggleFeatured = async (game: AdminGame) => {
    setErrorMessage("");
    setSuccessTitle("");
    try {
      const response = await fetch(`/api/admin/games/${encodeURIComponent(game.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !game.is_featured }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Status featured gagal diubah.");
      await loadGames();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Status featured gagal diubah.");
    }
  };

  const deleteGame = async (game: AdminGame) => {
    if (!window.confirm(`Hapus ${game.title}? Data terkait dan media game juga akan dihapus.`)) return;
    setErrorMessage("");
    setSuccessTitle("");
    try {
      const response = await fetch(`/api/admin/games/${encodeURIComponent(game.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string; warning?: string };
      if (!response.ok) throw new Error(result.error ?? "Game gagal dihapus.");
      setSuccessTitle(`${game.title} berhasil dihapus${result.warning ? `. ${result.warning}` : ""}`);
      await loadGames();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Game gagal dihapus.");
    }
  };

  const submitGame = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setSuccessTitle("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const downloadVersions = versionFields.map((version, index) => {
      const links: { platform: DownloadPlatform; serverName: string; destinationUrl: string }[] = [];
      for (const platform of ["windows", "android"] as const) {
        for (let serverNumber = 1; serverNumber <= 3; serverNumber += 1) {
          const destinationUrl = String(formData.get(`version_${index}_${platform}_${serverNumber}`) ?? "").trim();
          if (destinationUrl) links.push({ platform, serverName: `Server ${serverNumber}`, destinationUrl });
        }
      }
      return { versionLabel: String(formData.get(`version_label_${index}`) ?? "").trim(), links };
    });

    if (downloadVersions.some((version) => !version.versionLabel || version.links.length === 0)) {
      setErrorMessage("Setiap versi harus memiliki nama dan minimal satu link server.");
      setIsSaving(false);
      return;
    }

    formData.set("downloadVersions", JSON.stringify(downloadVersions));
    formData.set("is_featured", formData.has("is_featured") ? "true" : "false");
    formData.set("is_18_plus", formData.has("is_18_plus") ? "true" : "false");

    try {
      const isEditing = Boolean(selectedGame);
      const endpoint = selectedGame ? `/api/admin/games/${encodeURIComponent(selectedGame.id)}` : "/api/admin/games";
      const response = await fetch(endpoint, { method: isEditing ? "PATCH" : "POST", body: formData });
      const result = await response.json() as { error?: string; title?: string };
      if (!response.ok) throw new Error(result.error ?? "Game gagal disimpan.");

      setSuccessTitle(`${result.title ?? String(formData.get("title"))} berhasil ${isEditing ? "diperbarui" : "ditambahkan"}`);
      setSelectedGame(null);
      setActiveView("list");
      form.reset();
      await loadGames();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Game gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-back" href="/"><ArrowLeft size={16} /> Kembali ke katalog</Link>
        <span className="admin-user">Masuk sebagai <strong>{adminName}</strong></span>
      </header>

      <section className="admin-content">
        <div className="admin-heading">
          <div>
            <span className="admin-eyebrow">PENGELOLAAN KATALOG</span>
            <h1>{activeView === "list" ? "Kelola game" : selectedGame ? "Edit game" : "Tambah game"}</h1>
            <p>{activeView === "list" ? "Atur publikasi, featured post, dan seluruh konten game." : "Lengkapi informasi game, media, dan link server unduhan."}</p>
          </div>
          <div className="admin-heading-actions">
            <span className="admin-status"><span /> ADMIN CONSOLE</span>
            {vipMemberCount > 0 && <span className="admin-vip-count">{vipMemberCount} VIP</span>}
            <Link className="admin-add-button" href="/admin?section=vip"><Crown size={15} /> Kelola VIP</Link>
            <button className="admin-add-button" onClick={() => { setSelectedGame(null); setVersionFields([{ key: `new-${Date.now()}`, label: "Versi 1" }]); setActiveView("form"); setErrorMessage(""); setSuccessTitle(""); }}><Plus size={15} /> Tambah game</button>
          </div>
        </div>

        {errorMessage && <div className="admin-message error" role="alert">{errorMessage}</div>}
        {successTitle && <div className="admin-message success" role="status"><Check size={17} /> {successTitle}</div>}

        {activeView === "list" ? <section className="admin-list-shell">
          <div className="admin-list-toolbar"><div><h2>Daftar game</h2><span>{games.length} postingan</span></div><input aria-label="Cari game di dashboard" placeholder="Cari judul atau kategori..." value={listSearch} onChange={(event) => setListSearch(event.target.value)} /></div>
          {isLoadingGames ? <div className="admin-list-empty">Memuat daftar game...</div> : games.filter((game) => `${game.title} ${getCategoryName(game)}`.toLowerCase().includes(listSearch.toLowerCase())).length === 0 ? <div className="admin-list-empty">{games.length ? "Tidak ada game yang cocok." : "Belum ada postingan game."}</div> : <div className="admin-game-list">
            {games.filter((game) => `${game.title} ${getCategoryName(game)}`.toLowerCase().includes(listSearch.toLowerCase())).map((game) => <article className="admin-game-row" key={game.id}>
              <div className="admin-game-thumb" style={{ backgroundImage: game.thumbnail ? `url("${game.thumbnail}")` : undefined }} />
              <div className="admin-game-details"><strong>{game.title}</strong><span>{getCategoryName(game)} · {game.slug}</span><small>{game.game_download_versions.length} versi · {game.game_download_versions.reduce((total, version) => total + version.download_links.length, 0)} link · {game.game_galleries.length} screenshot</small></div>
              <button className={`featured-toggle ${game.is_featured ? "enabled" : ""}`} onClick={() => void toggleFeatured(game)} aria-pressed={game.is_featured} title={game.is_featured ? "Hapus dari featured" : "Jadikan featured"}><Star size={15} fill={game.is_featured ? "currentColor" : "none"} /><span>{game.is_featured ? "Featured" : "Jadikan featured"}</span></button>
              <div className="admin-game-actions"><button className="admin-icon-button" aria-label={`Edit ${game.title}`} title="Edit game" onClick={() => { setSelectedGame(game); setVersionFields(game.game_download_versions.length ? game.game_download_versions.map((version) => ({ key: version.id, label: version.version_label })) : [{ key: `new-${Date.now()}`, label: "Versi 1" }]); setActiveView("form"); setErrorMessage(""); setSuccessTitle(""); }}><Pencil size={15} /></button><button className="admin-icon-button danger" aria-label={`Hapus ${game.title}`} title="Hapus game" onClick={() => void deleteGame(game)}><Trash2 size={16} /></button></div>
            </article>)}
          </div>}
        </section> : <>
          <button className="admin-return-list" onClick={() => { setActiveView("list"); setSelectedGame(null); }}><ArrowLeft size={14} /> Kembali ke daftar game</button>

        <form key={selectedGame?.id ?? "new-game"} className="admin-form" onSubmit={submitGame}>
          <section className="admin-form-section">
            <div className="form-section-heading"><span>01</span><div><h2>Informasi game</h2><p>Data yang tampil pada katalog dan halaman detail.</p></div></div>
            <div className="admin-fields two-columns">
              <label className="admin-field"><span>Judul game & versi <b>*</b></span><input name="title" required maxLength={140} defaultValue={selectedGame?.title ?? ""} placeholder="Contoh: Elden Ring v1.16" /></label>
              <label className="admin-field"><span>Kategori <b>*</b></span><input name="category" required maxLength={60} defaultValue={selectedGame ? getCategoryName(selectedGame) : ""} placeholder="Action RPG" /></label>
              <label className="admin-field"><span>Developer</span><input name="developer" maxLength={100} defaultValue={selectedGame?.developer ?? ""} placeholder="Nama developer" /></label>
              <label className="admin-field"><span>Tanggal rilis</span><input name="release_date" type="date" defaultValue={selectedGame?.release_date ?? ""} /></label>
              <label className="admin-field"><span>Ukuran file</span><input name="file_size" maxLength={40} defaultValue={selectedGame?.file_size ?? ""} placeholder="Contoh: 68.4 GB" /></label>
              <label className="admin-field full-width"><span>Deskripsi game <b>*</b></span><textarea name="description" required rows={4} maxLength={5000} defaultValue={selectedGame?.description ?? ""} placeholder="Tulis ringkasan game..." /></label>
            </div>
            <div className="admin-toggles">
              <label><input type="checkbox" name="is_featured" defaultChecked={selectedGame?.is_featured ?? false} /> <span><strong>Featured game</strong><small>Tampilkan di slider unggulan. Maksimal lima game.</small></span></label>
              <label><input type="checkbox" name="is_18_plus" defaultChecked={selectedGame?.is_18_plus ?? true} /> <span><strong>Konten 18+</strong><small>Tampilkan peringatan usia di detail game.</small></span></label>
            </div>
          </section>

          <section className="admin-form-section">
            <div className="form-section-heading"><span>02</span><div><h2>Media game</h2><p>Gambar akan dikompres ke format WebP saat diunggah.</p></div></div>
            <div className="admin-fields two-columns">
              <label className="admin-file-field"><span>Thumbnail utama {selectedGame ? "(opsional)" : <b>*</b>}</span>{selectedGame?.thumbnail && <span className="current-media" style={{ backgroundImage: `url("${selectedGame.thumbnail}")` }} />}<span className="file-picker"><Upload size={17} /><span>{selectedGame ? "Pilih file thumbnail" : "Pilih file thumbnail"}</span><small>JPG, PNG, WebP · maks. 10 MB</small><input type="file" name="thumbnail" accept="image/jpeg,image/png,image/webp" /></span><span className="admin-media-or">atau URL HTTPS</span><input className="admin-url-input" type="url" name="thumbnail_url" placeholder="https://example.com/thumbnail.jpg" /></label>
              <label className="admin-file-field"><span>Screenshot gameplay {selectedGame ? "(opsional, 3–5 untuk mengganti)" : <b>*</b>}</span>{selectedGame && <span className="current-gallery">{selectedGame.game_galleries.length} screenshot tersimpan</span>}<span className="file-picker"><Upload size={17} /><span>Pilih file screenshot</span><small>JPG, PNG, WebP · maks. 10 MB/gambar</small><input type="file" name="screenshots" accept="image/jpeg,image/png,image/webp" multiple /></span><span className="admin-media-or">atau URL HTTPS · satu URL per baris</span><textarea className="admin-url-input admin-url-list" name="screenshot_urls" rows={3} placeholder={selectedGame ? "Isi 3–5 URL untuk mengganti galeri" : "https://example.com/screenshot-1.jpg\nhttps://example.com/screenshot-2.jpg\nhttps://example.com/screenshot-3.jpg"} /></label>
            </div>
          </section>

          <section className="admin-form-section">
            <div className="form-section-heading"><span>03</span><div><h2>Versi & link download</h2><p>Tambahkan grup versi; setiap versi dapat memiliki server Windows dan Android.</p></div></div>
            <div className="admin-version-list">
              {versionFields.map((version, index) => {
                const savedVersion = selectedGame?.game_download_versions.find((item) => item.id === version.key);
                return <section className="admin-version-card" key={version.key}>
                  <div className="admin-version-card-heading">
                    <label className="admin-field"><span>Nama versi <b>*</b></span><input name={`version_label_${index}`} required maxLength={60} defaultValue={version.label} placeholder="Contoh: v1.2.0 / Update 2026" /></label>
                    <button className="admin-remove-version" type="button" disabled={versionFields.length === 1} onClick={() => setVersionFields((current) => current.filter((item) => item.key !== version.key))}>Hapus versi</button>
                  </div>
                  <div className="admin-server-grid">
                    {(["windows", "android"] as const).map((platform) => (
                      <div className="admin-server-group" key={platform}>
                        <h3>{platform === "windows" ? "Windows" : "Android"}</h3>
                        {[1, 2, 3].map((serverNumber) => <label className="admin-field" key={serverNumber}><span>Server {serverNumber}</span><input type="url" name={`version_${index}_${platform}_${serverNumber}`} defaultValue={savedVersion?.download_links.find((link) => link.platform === platform && link.server_name === `Server ${serverNumber}`)?.destination_url ?? ""} placeholder="https://..." /></label>)}
                      </div>
                    ))}
                  </div>
                </section>;
              })}
            </div>
            <button className="admin-add-version" type="button" disabled={versionFields.length >= 10} onClick={() => setVersionFields((current) => [...current, { key: `new-${Date.now()}-${current.length}`, label: `Versi ${current.length + 1}` }])}><Plus size={15} /> Tambah versi</button>
          </section>

          <div className="admin-submit-row"><span>Field bertanda <b>*</b> wajib diisi. Screenshot baru harus berjumlah 3–5 gambar.</span><button type="submit" disabled={isSaving}>{isSaving ? <LoaderCircle size={16} className="admin-spinner" /> : <Upload size={16} />} {isSaving ? "Menyimpan..." : selectedGame ? "Simpan perubahan" : "Simpan game"}</button></div>
        </form>
        </>}
      </section>
      <SiteFooter />
    </main>
  );
}