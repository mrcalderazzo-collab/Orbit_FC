// PlaybooksPage — the library view over the playbook engine (data/playbooks.ts).
// Every recurring kind of work has a standardized step sequence that auto-loads
// onto matching tickets (playbookFor); this surfaces the catalog so the process
// is visible, consistent, and the same across 50 or 4000 buildings — plus a live
// count of open tickets currently running each playbook. The Emergency playbook
// is shown read-only (it runs live on the Emergency Desk).
import { useMemo, useState } from "react";
import { useOrbit } from "@/store/OrbitProvider";
import { PLAYBOOKS, playbookFor, type Playbook } from "@/data/playbooks";
import { EMERGENCY_WORKFLOW } from "@/lib/operatingSpine";
import { TopBar } from "@/components/shell/TopBar";
import { Glass, Icon, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

const CAT_META: Record<string, { label: string; icon: string; color: string }> = {
  maintenance: { label: "Maintenance", icon: "wrench", color: "#3b82f6" },
  systems: { label: "Building systems", icon: "activity", color: "#f59e0b" },
  compliance: { label: "Compliance", icon: "clipboard-check", color: "#a855f7" },
  finance: { label: "Finance", icon: "circle-dollar-sign", color: "#22c55e" },
  sanitation: { label: "Sanitation", icon: "trash-2", color: "#14b8a6" },
};
const catMeta = (k: string) => CAT_META[k] || { label: k, icon: "list-checks", color: "var(--acc-text)" };

export function PlaybooksPage() {
  const { tickets, nav } = useOrbit();

  // live count of open tickets currently matched to each playbook
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    tickets.forEach((t) => { if (t.status === "Closed" || t.mergedInto) return; const pb = playbookFor(t); if (pb) m[pb.key] = (m[pb.key] || 0) + 1; });
    return m;
  }, [tickets]);

  const grouped = useMemo(() => {
    const g = new Map<string, Playbook[]>();
    PLAYBOOKS.forEach((pb) => { if (!g.has(pb.categoryKey)) g.set(pb.categoryKey, []); g.get(pb.categoryKey)!.push(pb); });
    return [...g.entries()];
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <TopBar title="Playbooks" sub={`${PLAYBOOKS.length} standardized workflows · auto-applied to matching tickets`} />
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 28px 32px", minHeight: 0 }}>
        <Glass style={{ padding: "12px 15px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }} accent="#3b82f6">
          <Icon name="info" size={15} color="#3b82f6" />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
            When a matching ticket arrives, its playbook pre-loads the step checklist (and default vendor/tags) automatically — so the same leak or no-heat process runs the same way everywhere. The live counts show how many open tickets are on each.
          </span>
        </Glass>

        {/* emergency playbook — runs live on the Emergency Desk */}
        <div style={{ marginBottom: 22 }}>
          <div style={catHead}>Life safety</div>
          <Glass style={{ padding: 16 }} accent="#ef4444">
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "rgba(239,68,68,0.12)", flexShrink: 0 }}><Icon name="siren" size={19} color="#ef4444" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{EMERGENCY_WORKFLOW.name}</span>
                  <Tag color="#ef4444">Live · Emergency Desk</Tag>
                </div>
                <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{EMERGENCY_WORKFLOW.appliesTo}</span>
              </div>
              <button onClick={() => nav("emergencies")} style={openBtn}><Icon name="arrow-up-right" size={13} color="var(--ink-2)" />Open desk</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
              {EMERGENCY_WORKFLOW.steps.map((s, i) => <StepChip key={s.id} n={i + 1} label={s.label} />)}
            </div>
          </Glass>
        </div>

        {grouped.map(([cat, list]) => {
          const m = catMeta(cat);
          return (
            <div key={cat} style={{ marginBottom: 22 }}>
              <div style={catHead}><Icon name={m.icon} size={12} color={m.color} /> {m.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                {list.map((pb) => <PlaybookCard key={pb.key} pb={pb} count={counts[pb.key] || 0} color={m.color} onOpen={() => nav("tickets")} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlaybookCard({ pb, count, color, onOpen }: { pb: Playbook; count: number; color: string; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Glass style={{ padding: 16 }} accent={color}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span style={{ width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center", background: color + "1a", flexShrink: 0 }}><Icon name="list-checks" size={17} color={color} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{pb.label}</span>
          <span style={{ display: "block", marginTop: 3, fontFamily: MONO, fontSize: 8.5, color: "var(--ink-4)" }}>{pb.steps.length} steps{pb.defaultVendor ? " · " + pb.defaultVendor : ""}</span>
        </div>
        {count > 0 && <button onClick={onOpen} title="Open matching tickets" style={{ ...openBtn, border: "1px solid " + color, color }}>{count} live</button>}
      </div>
      {(pb.tags && pb.tags.length > 0) && <div style={{ display: "flex", gap: 6, marginTop: 10 }}>{pb.tags.map((t) => <Tag key={t} color={color}>{t}</Tag>)}</div>}
      <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, border: 0, background: "none", cursor: "pointer", color: "var(--ink-3)", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={12} color="var(--ink-3)" />{open ? "Hide steps" : "View steps"}
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 0 }}>
          {pb.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 9, padding: "6px 0", borderTop: i ? "1px solid var(--hair)" : "none" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: color + "1a", color, fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.4 }}>{s}</span>
            </div>
          ))}
        </div>
      )}
    </Glass>
  );
}

function StepChip({ n, label }: { n: number; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 5px", borderRadius: 99, background: "var(--fill-2)", border: "1px solid var(--hair-2)" }}>
      <span style={{ width: 16, height: 16, borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(239,68,68,0.14)", color: "#ef4444", fontFamily: MONO, fontSize: 8, fontWeight: 700 }}>{n}</span>
      <span style={{ fontFamily: SANS, fontSize: 11.5, color: "var(--ink-2)" }}>{label}</span>
    </span>
  );
}

const catHead: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 10 };
const openBtn: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-3)", color: "var(--ink-2)", fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" };
