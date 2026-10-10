"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";

function toSafeRedirect(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = toSafeRedirect(searchParams.get("redirect_url"));

  const [username, setUsername] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clerkMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "errors" in err) {
      const apiErrors = (err as { errors?: { longMessage?: string; message?: string }[] }).errors;
      if (apiErrors?.length) return apiErrors[0].longMessage ?? apiErrors[0].message ?? fallback;
    }
    return fallback;
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setError(null);

    setBusy(true);
    try {
      await signUp.create({ username: username.trim(), emailAddress: emailAddress.trim(), password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(clerkMessage(err, "Pendaftaran gagal. Periksa kembali isian Anda."));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setBusy(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.push(target);
      } else {
        setError("Verifikasi belum selesai. Coba lagi.");
      }
    } catch (err) {
      setError(clerkMessage(err, "Kode verifikasi tidak valid."));
    } finally {
      setBusy(false);
    }
  }

  if (step === "verify") {
    return (
      <div className="auth-card">
        <span className="section-label">VERIFIKASI EMAIL</span>
        <h1>Cek email kamu</h1>
        <p>Kami mengirim kode verifikasi ke <strong>{emailAddress}</strong>. Masukkan kodenya di bawah ini.</p>
        <form onSubmit={handleVerify} className="auth-form">
          <label className="auth-field">
            <span>Kode verifikasi</span>
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button" disabled={busy}>{busy ? "Memverifikasi..." : "Verifikasi"}</button>
          <button type="button" className="auth-link" onClick={() => setStep("form")}>Kembali</button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <span className="section-label">DAFTAR</span>
      <h1>Buat akun ZOPLAY</h1>
      <p>Daftar dengan email, username, dan password.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Username</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required minLength={3} />
        </label>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" value={emailAddress} onChange={(event) => setEmailAddress(event.target.value)} autoComplete="email" required />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={8} />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {/* Elemen wajib untuk Smart CAPTCHA Clerk pada custom flow (bot protection). */}
        <div id="clerk-captcha" />
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "Memproses..." : "Daftar"}</button>
        <p className="auth-switch">Sudah punya akun? <Link href={`/sign-in?redirect_url=${encodeURIComponent(target)}`}>Masuk</Link></p>
      </form>
    </div>
  );
}
