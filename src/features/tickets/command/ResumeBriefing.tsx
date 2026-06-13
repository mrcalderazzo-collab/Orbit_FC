// ResumeBriefing — the handoff card. When anyone opens a case (especially
// covering for someone out), this answers: what's happening, what's been done,
// what changed, who's waiting, and the recommended next action — with one click
// to take ownership or continue. This is what makes work resumable.
import type { Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { attentionOf, nextAction } from "@/lib/attention";
import { FLOW_STAGES } from "@/data/flow";
import { PEOPLE } from "@/data/seed";
import { AttentionChip, Avatar, Btn, Glass, Icon, SectionLabel } from "@/components/ui";
import { seedMessageList } from "./commsSeed";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const OWNERS = ["luke", "cait", "maura", "gidi"];

export function ResumeBriefing({ t, f, onTab }: { t: Ticket; f: TicketFlow; onTab: (k: string) => void }) {
  const { ticketMessages, ticketProgress, assignTicket, currentUser, notify } = useOrbit();
  const msgs = ticketMessages[t.id] || seedMessageList(t, f);
  const lastIn = [...msgs].reverse().find((m) => m.dir === "in");
  const needsReply = msgs[msgs.length - 1]?.dir === "in";
  const attn = attentionOf(t, f, { needsReply });
  const action = nextAction(t, attn);

  const stageLabel = FLOW_STAGES.find((s) => s.key === f.stage)?.label ?? f.stage;
  const items = ticketProgress[t.id]?.items;
  const doneCount = items ? items.filter((i) => i.done).length : Math.max(0, f.stageIndex);
  const totalCount = items ? items.length : 6;

  const owner = t.assignee ? PEOPLE[t.assignee] : null;
  const backupId = OWNERS.find((o) => o !== t.assignee) || "cait";
  const iAmOwner = currentUser?.persona === "operator" && currentUser.who === t.assignee;

  const recent = t.log.slice(-2).reverse();
  const waiting = needsReply ? `${lastIn?.from || "Resident"} is waiting on a reply` : f.requiresVote && !f.awardedBidId ? "Awaiting the board's vote" : null;

  const goNext = () => {
    const map: Record<string, string> = { intake: "intake", triage: "intake", sourcing: "sourcing", vote: "sourcing", scheduled: "vendor", inprogress: "comms", review: "activity", closed: "activity" };
    onTab(map[f.stage] || "overview");
  };
  const take = () => { const who = currentUser?.persona === "operator" ? currentUser.who! : "nick"; assignTicket(t.id, who); notify("You now own " + t.id); };

  return (
    <Glass accent="var(--acc)" style={{ padding: 18, borderLeft: "2px solid rgba(var(--acc-rgb),0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Icon name="footprints" size={16} color="var(--acc-text)" />
        <SectionLabel>Resume · handoff briefing</SectionLabel>
        <span style={{ marginLeft: "auto" }}><AttentionChip attn={attn} /></span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 14 }}>
        <Brief icon="circle-help" label="What's happening" text={t.desc || `Reported via ${f.intake.channel} by ${f.intake.submitterName}.`} />
        <Brief icon="check-check" label="Done so far" text={`Reached ${stageLabel}. ${doneCount} of ${totalCount} steps complete${f.awarded ? ` · ${f.awarded.vendor} awarded` : ""}.`} />
        <Brief icon="history" label="What changed" text={recent.map((l) => l[2]).join(" · ") || "No recent activity."} />
        <Brief icon="hourglass" label="Waiting on" text={waiting || "No one is blocked on this right now."} highlight={!!waiting} />
      </div>

      {/* owner + recommended action */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 0", borderTop: "1px solid var(--hair-2)", borderBottom: "1px solid var(--hair-2)", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)" }}>OWNER</span>
          {owner ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Avatar person={owner} size={20} /><span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{owner.name}{iAmOwner ? " (you)" : ""}</span></span>
            : <span style={{ fontFamily: SANS, fontSize: 12.5, color: "#f59e0b" }}>Unassigned</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)" }}>BACKUP</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Avatar person={backupId} size={20} /><span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{PEOPLE[backupId].name}</span></span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)" }}>RECOMMENDED</span>
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--acc-text)" }}>{action.label}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 9 }}>
        {!iAmOwner && <Btn small icon="hand" onClick={take}>Take ownership</Btn>}
        <Btn small primary icon="arrow-right" onClick={goNext}>Continue work</Btn>
      </div>
    </Glass>
  );
}

function Brief({ icon, label, text, highlight }: { icon: string; label: string; text: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 9 }}>
      <Icon name={icon} size={14} color={highlight ? "#f59e0b" : "var(--ink-4)"} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
        <div style={{ fontFamily: SANS, fontSize: 12.5, color: highlight ? "var(--ink)" : "var(--ink-2)", lineHeight: 1.5 }}>{text}</div>
      </div>
    </div>
  );
}
