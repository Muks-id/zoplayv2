"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";

function toSafeRedirect(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function SignInForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = toSafeRedirect(searchParams.get("redirect_url"));

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
      const result = await signIn.create({ identifier: identifier.trim(), password });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.push(target);
      } else {
        setError("Proses masuk belum selesai. Periksa kembali kredensial Anda.");
      }
    } catch (err) {
      setError(clerkMessage(err, "Email/username atau password salah."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-card">
      <span className="section-label">MASUK</span>
      <h1>Selamat datang kembali</h1>
      <p>Masuk dengan email atau username dan password Anda.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span>Email atau username</span>
          <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="primary-button" disabled={busy}>{busy ? "Memproses..." : "Masuk"}</button>
        <p className="auth-switch">Belum punya akun? <Link href={`/sign-up?redirect_url=${encodeURIComponent(target)}`}>Daftar</Link></p>
      </form>
    </div>
  );
}
