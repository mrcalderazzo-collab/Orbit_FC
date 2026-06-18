// Login — demo account picker grouped by persona. In production this becomes a
// standard email/SSO sign-in (Argon2 + session/JWT); the persona routing stays.
import { useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { PERSONA_META, USERS, userPerson } from "@/data/identity";
import type { Persona } from "@/lib/types";
import { Avatar, Icon } from "@/components/ui";
import { OrbitWordmark } from "@/components/shell/Wordmark";

const MONO = "'JetBrains Mono', monospace";
const SANS = "Outfit, sans-serif";
const GROUPS: Persona[] = ["operator", "board", "super", "resident", "vendor"];

function RealAuth() {
  const { loginEmail } = useOrbit();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setBusy(true);
    try { await loginEmail(email.trim(), password, mode); }
    catch (e) { setErr(e instanceof Error ? e.message : "Sign-in failed"); }
    finally { setBusy(false); }
  };

  const field: React.CSSProperties = { width: "100%", fontFamily: SANS, fontSize: 14, color: "var(--ink)", background: "var(--fill-2)", border: "1px solid var(--hair-strong)", borderRadius: 10, padding: "11px 13px", outline: "none", marginBottom: 10 };
  return (
    <div style={{ marginBottom: 26, padding: 18, borderRadius: 16, background: "var(--panel)", border: "1px solid var(--hair-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-3)" }}>Live backend · {mode === "signin" ? "sign in" : "create account"}</span>
      </div>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@orbit.ops" autoComplete="email" style={field} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" autoComplete={mode === "signup" ? "new-password" : "current-password"} style={field} />
      {err && <p style={{ margin: "0 0 10px", fontFamily: SANS, fontSize: 12, color: "#ef4444", lineHeight: 1.4 }}>{err}</p>}
      <button onClick={submit} disabled={busy || !email || !password} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", background: "var(--acc)", color: "var(--on-accent)", fontFamily: SANS, fontSize: 14, fontWeight: 600, opacity: busy || !email || !password ? 0.6 : 1 }}>
        {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
      <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErr(null); }} style={{ width: "100%", marginTop: 9, background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 12, color: "var(--ink-3)" }}>
        {mode === "signin" ? "First time? Create an account" : "Have an account? Sign in"}
      </button>
    </div>
  );
}

export function Login() {
  const { login, backendLive } = useOrbit();
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: 32 }}>
      <div style={{ width: 460, maxWidth: "100%" }}>
        <div style={{ marginBottom: 28 }}><OrbitWordmark /></div>
        <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: "-0.6px", color: "var(--ink)" }}>Sign in to command</h1>
        <p style={{ margin: "0 0 26px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          {backendLive ? "Sign in with your account — or use a demo persona below" : "Demo accounts · production uses email / SSO"}
        </p>
        {backendLive && <RealAuth />}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {GROUPS.map((persona) => {
            const users = USERS.filter((u) => u.persona === persona);
            if (!users.length) return null;
            const meta = PERSONA_META[persona];
            return (
              <div key={persona}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Icon name={meta.icon} size={13} color={meta.tint} />
                  <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-3)" }}>{meta.label}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {users.map((u) => {
                    const p = userPerson(u)!;
                    return (
                      <button key={u.id} onClick={() => login(u.id)}
                        style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 14px", borderRadius: 14, cursor: "pointer", textAlign: "left", background: "var(--panel)", backdropFilter: "blur(25px)", border: "1px solid var(--hair-3)", transition: "border-color .15s, transform .12s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = meta.tint; e.currentTarget.style.transform = "translateX(3px)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--hair-3)"; e.currentTarget.style.transform = "translateX(0)"; }}>
                        <Avatar person={p} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{p.name}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)", marginTop: 2 }}>{u.title || u.scope}</div>
                        </div>
                        <Icon name="arrow-right" size={16} color="var(--ink-4)" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
