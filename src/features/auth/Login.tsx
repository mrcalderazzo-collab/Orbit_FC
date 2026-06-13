// Login — demo account picker grouped by persona. In production this becomes a
// standard email/SSO sign-in (Argon2 + session/JWT); the persona routing stays.
import { useOrbit } from "@/store/OrbitProvider";
import { PERSONA_META, USERS, userPerson } from "@/data/identity";
import type { Persona } from "@/lib/types";
import { Avatar, Icon } from "@/components/ui";
import { OrbitWordmark } from "@/components/shell/Wordmark";

const MONO = "'JetBrains Mono', monospace";
const SANS = "Outfit, sans-serif";
const GROUPS: Persona[] = ["operator", "board", "resident", "vendor"];

export function Login() {
  const { login } = useOrbit();
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto", padding: 32 }}>
      <div style={{ width: 460, maxWidth: "100%" }}>
        <div style={{ marginBottom: 28 }}><OrbitWordmark /></div>
        <h1 style={{ margin: "0 0 6px", fontFamily: SANS, fontWeight: 600, fontSize: 30, letterSpacing: "-0.6px", color: "var(--ink)" }}>Sign in to command</h1>
        <p style={{ margin: "0 0 26px", fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          Demo accounts · production uses email / SSO
        </p>
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
