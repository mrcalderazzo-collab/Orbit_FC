// NoticesPanel — building broadcasts an external persona can see (their building
// + any portfolio-wide notice). Read-only and scoped via scopedNotices; drafts
// stay internal. Shared by the board and resident portals.
import { useMemo } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { scopedNotices } from "@/data/identity";
import { buildingById } from "@/data/seed";
import { Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function NoticesPanel() {
  const { currentUser, notices } = useOrbit();
  const building = currentUser?.building ? buildingById(currentUser.building) : undefined;
  const items = useMemo(() => scopedNotices(currentUser, notices), [currentUser, notices]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Notices</h2>
        <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
          Announcements for {building?.name ?? "your building"}
        </p>
      </div>
      {items.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center" }}>
          <Icon name="megaphone" size={26} color="var(--ink-5)" />
          <p style={{ margin: "12px 0 0", fontFamily: SANS, fontSize: 13, color: "var(--ink-3)" }}>No notices right now. New building-wide announcements will appear here.</p>
        </Glass>
      ) : (
        items.map((n) => (
          <Glass key={n.id} style={{ padding: 18, borderLeft: n.urgent ? "3px solid #ef4444" : "1px solid var(--hair)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, flexWrap: "wrap" }}>
              {n.urgent && <Tag color="#ef4444" bg="rgba(239,68,68,0.12)">Urgent</Tag>}
              <Tag>{n.status}</Tag>
              <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.05em" }}>{n.audience}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>{n.at}</span>
            </div>
            <div style={{ fontFamily: SANS, fontSize: 15.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, marginBottom: 7 }}>{n.title}</div>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{n.body}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              {n.channels.map((c) => (
                <span key={c} style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", color: "var(--ink-4)", textTransform: "uppercase", background: "var(--fill-2)", border: "1px solid var(--hair-2)", padding: "2px 8px", borderRadius: 6 }}>{c}</span>
              ))}
            </div>
          </Glass>
        ))
      )}
    </div>
  );
}
