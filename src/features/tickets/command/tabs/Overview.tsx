// Overview tab — request, progress, next-action, cost posture, bids snapshot,
// owner + submitter context. Mirrors TicketFlow.jsx FlowOverview.
import type { Bid, Building, StageKey, Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { moneyFull, moneyShort } from "@/lib/format";
import { PEOPLE } from "@/data/seed";
import { Avatar, Btn, Glass, Icon, KV, SectionLabel } from "@/components/ui";
import { ProgressPanel } from "../ProgressPanel";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const ASSIGNEES = ["luke", "cait", "maura", "gidi"];

export function Overview({ t, b, f, onTab }: { t: Ticket; b: Building; f: TicketFlow; onTab: (k: string) => void }) {
  const { assignTicket } = useOrbit();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Glass style={{ padding: 18 }}>
          <SectionLabel style={{ marginBottom: 10 }}>The request</SectionLabel>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
            {t.desc || "Reported via " + f.intake.channel + " by " + f.intake.submitterName + ". " + f.intake.access}
          </p>
        </Glass>

        <ProgressPanel t={t} f={f} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <NextActionCard f={f} onTab={onTab} />
          <Glass style={{ padding: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>Cost posture</SectionLabel>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: "var(--ink)" }}>{moneyFull(f.estimate)}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-4)" }}>est.</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name={f.requiresVote ? "vote" : "circle-check-big"} size={14} color={f.requiresVote ? "#a855f7" : "#22c55e"} />
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: f.requiresVote ? "#a855f7" : "#22c55e" }}>
                {f.requiresVote ? "Over " + moneyShort(f.threshold) + " cap — board vote required" : "Under " + moneyShort(f.threshold) + " cap — PM may approve"}
              </span>
            </div>
          </Glass>
        </div>

        {f.bids.length > 0 && (
          <Glass style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <SectionLabel>Bids on file</SectionLabel>
              <button onClick={() => onTab("sourcing")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", fontFamily: MONO, fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                OPEN VOTE <Icon name="arrow-right" size={12} color="var(--ink-3)" />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {f.bids.map((bid) => <BidMiniRow key={bid.id} bid={bid} awarded={f.awardedBidId === bid.id} />)}
            </div>
          </Glass>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Owner</SectionLabel>
          {t.assignee ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar person={t.assignee} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap" }}>{PEOPLE[t.assignee].name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{PEOPLE[t.assignee].role}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ASSIGNEES.map((p) => (
                <button key={p} onClick={() => assignTicket(t.id, p)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 9px 5px 5px", borderRadius: 99, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}>
                  <Avatar person={p} size={20} />
                  <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-2)" }}>{PEOPLE[p].name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          )}
        </Glass>

        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>Submitted by</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <KV k="Source" v={f.intake.submitterName + (f.intake.unit ? " · " + f.intake.unit : "")} />
            <KV k="Channel" v={f.intake.channel} />
            <KV k="Reported" v={f.intake.reportedAt.slice(0, 10)} />
          </div>
        </Glass>

        <Glass style={{ padding: 16 }}>
          <SectionLabel style={{ marginBottom: 10 }}>Communications</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>{f.updates.length} updates shared</span>
            <button onClick={() => onTab("comms")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--acc-text)", fontFamily: MONO, fontSize: 10 }}>OPEN →</button>
          </div>
        </Glass>

        <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", padding: "0 4px" }}>{b.name} · {b.code}</span>
      </div>
    </div>
  );
}

function NextActionCard({ f, onTab }: { f: TicketFlow; onTab: (k: string) => void }) {
  const map: Record<StageKey, { t: string; d: string; ic: string; go: string }> = {
    intake: { t: "Triage & route", d: "Confirm scope and assign an owner.", ic: "git-branch", go: "intake" },
    triage: { t: "Source vendors", d: "Request competitive bids.", ic: "search-check", go: "sourcing" },
    sourcing: { t: f.requiresVote ? "Open board vote" : "Award the bid", d: f.requiresVote ? "Send bids to the board." : "Pick a vendor and award.", ic: "vote", go: "sourcing" },
    vote: { t: "Awaiting board", d: "Voting in progress — monitor results.", ic: "vote", go: "sourcing" },
    scheduled: { t: "Confirm the visit", d: "Resident + vendor access locked.", ic: "calendar-check", go: "vendor" },
    inprogress: { t: "Work underway", d: "Track progress, post updates.", ic: "wrench", go: "comms" },
    review: { t: "Verify & close", d: "Final walkthrough and sign-off.", ic: "clipboard-check", go: "activity" },
    closed: { t: "Resolved", d: "Chain-verified and closed.", ic: "circle-check-big", go: "activity" },
  };
  const a = map[f.stage] || map.intake;
  return (
    <Glass accent="var(--acc)" style={{ padding: 16, borderLeft: "2px solid rgba(var(--acc-rgb),0.5)" }}>
      <SectionLabel style={{ marginBottom: 12 }}>Next action</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(var(--acc-rgb),0.12)", border: "1px solid rgba(var(--acc-rgb),0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name={a.ic} size={17} color="var(--acc)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{a.t}</div>
          <div style={{ fontFamily: SANS, fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{a.d}</div>
        </div>
      </div>
      <Btn small primary icon="arrow-right" onClick={() => onTab(a.go)} style={{ marginTop: 13, width: "100%", justifyContent: "center" }}>Go</Btn>
    </Glass>
  );
}

export function BidMiniRow({ bid, awarded }: { bid: Bid; awarded: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 10, background: awarded ? "rgba(34,197,94,0.07)" : "var(--fill-1)", border: "1px solid " + (awarded ? "rgba(34,197,94,0.3)" : "var(--hair-2)") }}>
      <Icon name={awarded ? "award" : "file-text"} size={14} color={awarded ? "#22c55e" : "var(--ink-3)"} />
      <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{bid.vendor}{bid.recommended && !awarded ? "  ·  AI pick" : ""}</span>
      <span style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--ink-4)" }}>{bid.leadTimeDays}d</span>
      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: awarded ? "#22c55e" : "var(--ink)" }}>{moneyFull(bid.amount)}</span>
    </div>
  );
}
