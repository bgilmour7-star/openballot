"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type Mode = "signin" | "signup" | "verify";
export default function SignIn() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const done = () => { window.location.href = "/signin/done"; };
  const errText = (e: any) => e?.message || e?.error?.message || "Something went wrong. Please try again.";

  async function google() {
    setBusy(true); setMsg(null);
    try {
      const r: any = await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/signin/done` });
      if (r?.error) setMsg(errText(r.error));
    } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "signin") {
        const r: any = await authClient.signIn.email({ email, password });
        if (r?.error) {
          if (/verif/i.test(r.error.message ?? "") || r.error.status === 403) { setMode("verify"); setMsg("Please confirm your email first. Check your inbox for a code or link."); }
          else setMsg(errText(r.error));
        } else done();
      } else if (mode === "signup") {
        const r: any = await authClient.signUp.email({ email, password, name: email.split("@")[0], callbackURL: `${window.location.origin}/signin/done` } as any);
        if (r?.error) setMsg(errText(r.error));
        else if (r?.data?.token || r?.data?.session) done();
        else { setMode("verify"); setMsg("Check your email to confirm your account. Enter the code here, or use the link in the email."); }
      } else {
        const ac: any = authClient;
        const r: any = await ac.emailOtp.verifyEmail({ email, otp: code.trim() });
        if (r?.error) setMsg(errText(r.error));
        else {
          const s: any = await authClient.signIn.email({ email, password });
          if (s?.error) { setMode("signin"); setMsg("Email confirmed. Please sign in."); } else done();
        }
      }
    } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  }
  async function resend() {
    setBusy(true);
    try { const ac: any = authClient; await ac.emailOtp.sendVerificationOtp({ email, type: "email-verification" }); setMsg("A new code is on its way."); }
    catch (e) { setMsg(errText(e)); }
    setBusy(false);
  }

  return (
    <div className="card stack">
      {process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "1" && <>
        <button className="btn secondary block" onClick={google} disabled={busy}>Continue with Google</button>
        <p className="xs muted" style={{ textAlign: "center", margin: 0 }}>or with email</p>
      </>}
      <form onSubmit={submit} className="stack">
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "verify" ? (
          <div>
            <label htmlFor="pw">Password {mode === "signup" && <span className="hint">(at least 8 characters)</span>}</label>
            <input id="pw" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        ) : (
          <div>
            <label htmlFor="code">Code from your email</label>
            <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
        )}
        {msg && <p className="notice" role="status">{msg}</p>}
        <button className="btn block" disabled={busy}>{mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Confirm email"}</button>
      </form>
      <div className="row between small">
        {mode === "signin" && <button className="btn ghost small" onClick={() => { setMode("signup"); setMsg(null); }}>New here? Create an account</button>}
        {mode === "signup" && <button className="btn ghost small" onClick={() => { setMode("signin"); setMsg(null); }}>Have an account? Sign in</button>}
        {mode === "verify" && <><button className="btn ghost small" onClick={resend} disabled={busy || !email}>Send a new code</button><button className="btn ghost small" onClick={() => setMode("signin")}>Back to sign in</button></>}
      </div>
      <p className="xs muted" style={{ margin: 0 }}>By signing in you agree to our <a href="/privacy">privacy note</a>. Your email is used for your account only.</p>
    </div>
  );
}
