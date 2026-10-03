"use client";
import { authClient } from "@/lib/auth/client";
export default function SignOut() {
  return <button className="btn ghost" onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>Sign out</button>;
}
