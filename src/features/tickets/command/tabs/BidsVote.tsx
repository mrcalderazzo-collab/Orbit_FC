// Bids & Vote tab — competitive bid cards, live vote tally + quorum, board
// roster with in-console voting, award. Votes flow through the shared ballot
// store so board-portal votes appear here live. Mirrors TicketFlowTabs.jsx.
import { useState } from "react";
import type { Bid, Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { dateShift, moneyFull, moneyShort } from "@/lib/format";
import { Btn, Glass, Icon, SectionLabel, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";

export function BidsVote({ t, f }: { t: Ticket; f: TicketFlow }) {
  const { notify, setTicketStatus, ballots, castBallot } = useOrbit();
  const [vote, setVote] = useState(() =>
    f.vote
      ? f.vote.board.map((m) => {
          const b = (ballots[t.id] || {})[m.name];
          return b ? { ...m, choice: b, rationale: m.rationale || "Cast in console", at: dateShift(0) } : { ...m };
        })
      : null,
  );
  const [awarded, setAwarded] = useState<string | null>(f.awardedBidId);

  const tally: Record<string, number> = {};
  f.bids.forEach((b) => (tally[b.id] = 0));
  (vote || []).forEach((m) => { if (m.choice) tally[m.choice] = (tally[m.choice] || 0) + 1; });
  const totalVotes = Object.values(tally).reduce((a, c) => a + c, 0);
  const leadId = Object.keys(tally).sort((a, c) => tally[c] - tally[a])[0];
  const leadCount = tally[leadId] || 0;

  const castFor = (memberIdx: number, bidId: string) => {
    if (awarded || !vote) return;
    const m = vote[memberIdx];
    castBallot(t.id, m.name, bidId);
    setVote((v) => v!.map((mm, i) => (i === memberIdx ? { ...mm, choice: bidId, rationale: mm.rationale || "Cast in console", at: dateShift(0) } : mm)));
  };
  const award = (bidId: string) => {
    setAwarded(bidId);
    const v = f.bids.find((b) => b.id === bidId)!;
    notify(v.vendor + " awarded · " + moneyFull(v.amount));
    if (t.status === "Open" || t.status === "Assigned") setTicketStatus(t.id, "In progress");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 14, background: f.requiresVote ? "rgba(168,85,247,0.06)" : "rgba(34,197,94,0.06)", border: "1px solid " + (f.requiresVote ? "rgba(168,85,247,0.2)" : "rgba(34,197,94,0.2)") }}>
        <Icon name={f.requiresVote ? "vote" : "shield-check"} size={18} color={f.requiresVote ? "#a855f7" : "#22c55e"} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: SANS, fontSize: 13.5, color: "var(--ink)", fontWeight: 500 }}>{f.requiresVote ? "Board vote required" : "Within PM approval authority"}</div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>Est. {moneyFull(f.estimate)} vs. {moneyShort(f.threshold)} spend cap · {f.bids.length} competitive bids</div>
        </div>
        {f.requiresVote && vote && f.vote && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>QUORUM</div>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: totalVotes >= f.vote.quorum ? "#22c55e" : "var(--ink-2)" }}>{totalVotes}/{f.vote.quorum}</div>
          </div>
        )}
      </div>

      <div>
        <SectionLabel style={{ marginBottom: 12 }}>Competitive bids</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          {f.bids.map((bid) => (
            <BidCard key={bid.id} bid={bid} votes={tally[bid.id] || 0} leading={f.requiresVote && bid.id === leadId && leadCount > 0} awarded={awarded === bid.id} canAward={!awarded} onAward={() => award(bid.id)} showVote={f.requiresVote} />
          ))}
        </div>
      </div>

      {f.requiresVote && vote && f.vote && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          <Glass style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <SectionLabel>Live tally</SectionLabel>
              {awarded ? <Tag color="#22c55e" bg="rgba(34,197,94,0.12)" style={{ marginLeft: "auto" }}>AWARDED</Tag> : <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "#a855f7" }}>● VOTING OPEN</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {f.bids.map((bid) => {
                const v = tally[bid.id] || 0;
                const pct = totalVotes ? Math.round((v / totalVotes) * 100) : 0;
                const win = bid.id === leadId && v > 0;
                return (
                  <div key={bid.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{bid.vendor}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: win ? "var(--acc-text)" : "var(--ink-3)" }}>{v} {v === 1 ? "vote" : "votes"}</span>
                    </div>
                    <div style={{ height: 10, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
                      <div style={{ width: Math.max(pct, v ? 6 : 0) + "%", height: "100%", borderRadius: 99, background: win ? "var(--acc)" : "var(--ink-4)", boxShadow: win ? "0 0 10px rgba(var(--acc-rgb),0.4)" : "none", transition: "width .4s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {!awarded && leadCount > 0 && (
              <Btn primary icon="award" onClick={() => award(leadId)} style={{ marginTop: 18, width: "100%", justifyContent: "center" }}>Award to leader · {f.bids.find((b) => b.id === leadId)!.vendor}</Btn>
            )}
          </Glass>

          <Glass style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <SectionLabel>Board roster</SectionLabel>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)" }}>deadline {f.vote.deadline}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {vote.map((m, i) => {
                const choice = f.bids.find((b) => b.id === m.choice);
                return (
                  <div key={i} style={{ padding: "10px 0", borderBottom: i < vote.length - 1 ? "1px solid var(--hair)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", fontFamily: MONO, fontWeight: 700, fontSize: 10 }}>{m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{m.name}</div>
                        {choice ? (
                          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-3)" }}>voted {choice.vendor}{m.rationale ? " · “" + m.rationale + "”" : ""}</div>
                        ) : (
                          <div style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-5)" }}>not yet voted</div>
                        )}
                      </div>
                      {choice && <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.choice === leadId ? "var(--acc)" : "var(--ink-4)" }} />}
                    </div>
                    {!awarded && !choice && (
                      <div style={{ display: "flex", gap: 5, marginTop: 8, marginLeft: 38, flexWrap: "wrap" }}>
                        {f.bids.map((bid) => (
                          <button key={bid.id} onClick={() => castFor(i, bid.id)} style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-2)", padding: "3px 8px", borderRadius: 7, cursor: "pointer", background: "var(--fill-2)", border: "1px solid var(--hair-3)" }}>vote {bid.vendor.split(" ")[0]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Glass>
        </div>
      )}
    </div>
  );
}

function BidCard({ bid, votes, leading, awarded, canAward, onAward, showVote }: { bid: Bid; votes: number; leading: boolean; awarded: boolean; canAward: boolean; onAward: () => void; showVote: boolean }) {
  return (
    <div style={{ borderRadius: 16, padding: 16, background: awarded ? "rgba(34,197,94,0.05)" : "var(--fill-1)", border: "1.5px solid " + (awarded ? "rgba(34,197,94,0.4)" : leading ? "rgba(var(--acc-rgb),0.4)" : "var(--hair-2)"), position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
      {(bid.recommended || leading || awarded) && (
        <span style={{ position: "absolute", top: -9, left: 14, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 99, color: awarded || leading ? "#0a0a0a" : "#a855f7", background: awarded ? "#22c55e" : leading ? "var(--acc)" : "rgba(168,85,247,0.15)", border: leading || awarded ? "none" : "1px solid rgba(168,85,247,0.3)" }}>{awarded ? "AWARDED" : leading ? "LEADING" : "AI PICK"}</span>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{bid.vendor}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: bid.grade >= 90 ? "#22c55e" : "#f59e0b" }}><Icon name="star" size={11} color={bid.grade >= 90 ? "#22c55e" : "#f59e0b"} />{bid.grade}</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>{moneyFull(bid.amount)}</div>
      <div style={{ display: "flex", gap: 14 }}>
        <SpecMini icon="clock" v={bid.leadTimeDays + "d"} l="lead" />
        <SpecMini icon="shield" v={bid.warrantyMo + "mo"} l="warranty" />
        {showVote && <SpecMini icon="vote" v={"" + votes} l="votes" />}
      </div>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{bid.scope}. {bid.note}</p>
      {canAward ? (
        <Btn small onClick={onAward} icon="award" style={{ width: "100%", justifyContent: "center" }}>Award this bid</Btn>
      ) : awarded ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 8, borderRadius: 9, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontFamily: MONO, fontSize: 10, fontWeight: 700 }}><Icon name="check" size={13} color="#22c55e" />SELECTED</div>
      ) : null}
    </div>
  );
}
function SpecMini({ icon, v, l }: { icon: string; v: string; l: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}><Icon name={icon} size={12} color="var(--ink-4)" />{v}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{l}</span>
    </div>
  );
}
