"use client";

import { useState } from "react";
import Link from "next/link";
import { useSignIn } from "@clerk/nextjs";

const RESET_STRATEGY = "reset_password_email_code" as const;

export default function ForgotPasswordForm() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clerkMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "errors" in err) {
      const apiErrors = (err as { errors?: { longMessage?: string; message?: string }[] }).errors;
      if (apiErrors?.length) return apiErrors[0].longMessage ?? apiErrors[0].message ?? fallback;
    }
    return fallback;
  };

  async function handleRequestCode(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signIn.create({
        strategy: RESET_STRATEGY,
        identifier: identifier.trim(),
      });
      setStage("verify");
      setNotice("Jika email tersebut terdaftar, kami sudah mengirim kode verifikasi.");
    } catch (err) {
      setError(clerkMessage(err, "Gagal mengirim kode. Periksa kembali email Anda."));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: RESET_STRATEGY,
        code: code.trim(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        window.location.href = "/profile";
        return;
      }

      setError("Kode atau sandi baru tidak valid. Silakan coba lagi.");
    } catch (err) {
      setError(clerkMessage(err, "Kode atau sandi baru tidak valid."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <span className="section-label">LUPA SANDI</span>
      <h1>Atur ulang sandi</h1>

      {stage === "request" ? (
        <form onSubmit={handleRequestCode} className="auth-form">
          <p>Masukkan email terdaftar dan kami akan mengirim kode verifikasi.</p>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Mengirim..." : "Kirim kode"}
          </button>
          <p className="auth-switch">
            Ingat sandinya? <Link href="/sign-in">Kembali ke masuk</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleReset} className="auth-form">
          <p>Masukkan kode dari email dan sandi baru Anda.</p>
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="auth-field">
            <span>Kode verifikasi</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          </label>
          <label className="auth-field">
            <span>Sandi baru</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? "Memproses..." : "Simpan sandi baru"}
          </button>
          <p className="auth-switch">
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setStage("request");
                setCode("");
                setNotice(null);
              }}
            >
              Kirim ulang kode
            </button>
          </p>
        </form>
      )}
    </div>
  );
}