// Board Vote Center — the director-facing side of the shared ballot store.
// A board member sees every capital decision in their building that needs a
// vote, the competitive bids, the live tally + quorum, and casts their own
// ballot here. castBallot writes to the same store the operator's Bids & Vote
// tab reads, so a vote cast here shows up live in Ticket Command.
//
// Scope: bids (vendor · amount · lead · warranty · grade · scope) are the
// board's decision to make and are shown in full. Internal operator notes,
// the audit log, and other buildings never appear.
import { useMemo } from "react";
import type { Bid, Ticket, TicketFlow } from "@/lib/types";
import { useOrbit } from "@/store/OrbitProvider";
import { ticketFlow } from "@/data/flow";
import { boardVoteTickets } from "@/data/identity";
import { buildingById } from "@/data/seed";
import { moneyFull, moneyShort } from "@/lib/format";
import { Btn, Glass, Icon, SectionLabel, Tag } from "@/components/ui";

const SANS = "Outfit, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const PURPLE = "#a855f7";

/** Merge the deterministic seeded ballots with anything cast live in the shared
 *  store, keyed on director name. Live votes win. */
function mergedChoices(f: TicketFlow, live: Record<string, string> | undefined) {
  const board = f.vote?.board ?? [];
  return board.map((m) => ({ name: m.name, choice: live?.[m.name] ?? m.choice, rationale: m.rationale }));
}

export function VoteCenter() {
  const { currentUser, tickets, ballots } = useOrbit();
  const me = currentUser?.person?.name ?? "";
  const building = currentUser?.building ? buildingById(currentUser.building) : undefined;

  const items = useMemo(
    () => (currentUser ? boardVoteTickets(currentUser, tickets, ticketFlow) : []),
    [currentUser, tickets],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "var(--ink)" }}>Vote Center</h2>
          <p style={{ margin: "6px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-4)" }}>
            Capital decisions awaiting the board{building ? " · " + building.name : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)" }}>
          <Icon name="vote" size={16} color={PURPLE} />
          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{items.length}</span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-4)", textTransform: "uppercase" }}>open {items.length === 1 ? "vote" : "votes"}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <Glass style={{ padding: 40, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="check-check" size={26} color={PURPLE} />
          </div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>No votes pending</div>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: 13, color: "var(--ink-3)", lineHeight: 1.55 }}>
            When a project needs more than the manager's spend authority, the comparison of bids will appear here for the board to decide.
          </p>
        </Glass>
      ) : (
        items.map((t) => <VoteCard key={t.id} t={t} f={ticketFlow(t)} me={me} live={ballots[t.id]} />)
      )}
    </div>
  );
}

function VoteCard({ t, f, me, live }: { t: Ticket; f: TicketFlow; me: string; live: Record<string, string> | undefined }) {
  const { castBallot, notify } = useOrbit();
  const b = buildingById(t.building);
  const choices = mergedChoices(f, live);
  const settled = f.stageIndex > 3; // past the Board Vote stage → awarded/scheduled

  const tally: Record<string, number> = {};
  f.bids.forEach((bid) => (tally[bid.id] = 0));
  choices.forEach((m) => { if (m.choice) tally[m.choice] = (tally[m.choice] || 0) + 1; });
  const totalVotes = Object.values(tally).reduce((a, c) => a + c, 0);
  const leadId = Object.keys(tally).sort((a, c) => tally[c] - tally[a])[0];
  const leadCount = tally[leadId] || 0;
  const quorum = f.vote?.quorum ?? Math.ceil(choices.length / 2);
  const myVote = choices.find((m) => m.name === me)?.choice ?? null;
  const inRoster = choices.some((m) => m.name === me);

  const cast = (bidId: string) => {
    if (settled) return;
    castBallot(t.id, me, bidId);
    const bid = f.bids.find((x) => x.id === bidId);
    notify("Vote recorded · " + (bid?.vendor ?? "bid"));
  };

  return (
    <Glass style={{ padding: 0, overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--hair-2)", background: "rgba(168,85,247,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <Tag color={PURPLE} bg="rgba(168,85,247,0.12)">Board vote</Tag>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>{t.id} · {b?.name}</span>
          {settled
            ? <Tag color="#22c55e" bg="rgba(34,197,94,0.12)" style={{ marginLeft: "auto" }}>Decided</Tag>
            : <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: PURPLE }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: PURPLE, boxShadow: "0 0 6px " + PURPLE }} />Voting open</span>}
        </div>
        <div style={{ fontFamily: SANS, fontSize: 16.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{t.title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          <Meta icon="calculator" label="Estimate" value={moneyFull(f.estimate)} />
          <Meta icon="gavel" label="Approval cap" value={moneyShort(f.threshold)} />
          <Meta icon="users" label="Quorum" value={totalVotes + "/" + quorum} accent={totalVotes >= quorum ? "#22c55e" : undefined} />
          {f.vote?.deadline && <Meta icon="clock" label="Deadline" value={f.vote.deadline} />}
        </div>
      </div>

      {/* your vote banner */}
      {!settled && inRoster && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: "1px solid var(--hair-2)", background: myVote ? "rgba(34,197,94,0.05)" : "rgba(245,158,11,0.05)" }}>
          <Icon name={myVote ? "check-circle-2" : "alert-circle"} size={15} color={myVote ? "#22c55e" : "#f59e0b"} />
          <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>
            {myVote
              ? <>You voted for <b style={{ color: "var(--ink)" }}>{f.bids.find((x) => x.id === myVote)?.vendor}</b>. You can change it until the award is made.</>
              : <>Your vote is needed. Review the bids below and select one.</>}
          </span>
        </div>
      )}

      {/* bids */}
      <div style={{ padding: 18 }}>
        <SectionLabel style={{ marginBottom: 12 }}>Competitive bids</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(248px,1fr))", gap: 12 }}>
          {f.bids.map((bid) => (
            <BoardBidCard
              key={bid.id}
              bid={bid}
              votes={tally[bid.id] || 0}
              leading={bid.id === leadId && leadCount > 0}
              mine={myVote === bid.id}
              canVote={!settled && inRoster}
              onVote={() => cast(bid.id)}
            />
          ))}
        </div>

        {/* live tally */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel>Live tally</SectionLabel>
            <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.06em" }}>{totalVotes} of {choices.length} directors voted</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {f.bids.map((bid) => {
              const v = tally[bid.id] || 0;
              const pct = totalVotes ? Math.round((v / totalVotes) * 100) : 0;
              const win = bid.id === leadId && v > 0;
              return (
                <div key={bid.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{bid.vendor}</span>
                    {bid.id === myVote && <Tag color={PURPLE} bg="rgba(168,85,247,0.12)">Your vote</Tag>}
                    <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: win ? PURPLE : "var(--ink-3)" }}>{v} {v === 1 ? "vote" : "votes"}</span>
                  </div>
                  <div style={{ height: 10, borderRadius: 99, background: "var(--fill-3)", overflow: "hidden" }}>
                    <div style={{ width: Math.max(pct, v ? 6 : 0) + "%", height: "100%", borderRadius: 99, background: win ? PURPLE : "var(--ink-4)", boxShadow: win ? "0 0 10px rgba(168,85,247,0.45)" : "none", transition: "width .4s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* roster */}
        <div style={{ marginTop: 18 }}>
          <SectionLabel style={{ marginBottom: 10 }}>Board roster</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {choices.map((m, i) => {
              const choice = f.bids.find((x) => x.id === m.choice);
              const isMe = m.name === me;
              return (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < choices.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: PURPLE, fontFamily: MONO, fontWeight: 700, fontSize: 10 }}>{m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink)" }}>{m.name}{isMe && <span style={{ fontFamily: MONO, fontSize: 8.5, color: PURPLE, marginLeft: 7, letterSpacing: "0.08em" }}>YOU</span>}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: choice ? "var(--ink-3)" : "var(--ink-5)" }}>{choice ? "voted " + choice.vendor : "not yet voted"}</div>
                  </div>
                  {choice && <span style={{ width: 7, height: 7, borderRadius: "50%", background: m.choice === leadId ? PURPLE : "var(--ink-4)" }} />}
                </div>
              );
            })}
          </div>
        </div>

        {settled && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, padding: 11, borderRadius: 11, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <Icon name="award" size={15} color="#22c55e" />
            <span style={{ fontFamily: SANS, fontSize: 12.5, color: "var(--ink-2)" }}>
              The board awarded <b style={{ color: "var(--ink)" }}>{f.awarded?.vendor}</b>{f.awarded ? " · " + moneyFull(f.awarded.amount) : ""}. Work is underway.
            </span>
          </div>
        )}
      </div>
    </Glass>
  );
}

function Meta({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "var(--ink-4)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: accent || "var(--ink)" }}>
        <Icon name={icon} size={13} color={accent || "var(--ink-4)"} />{value}
      </span>
    </div>
  );
}

function BoardBidCard({ bid, votes, leading, mine, canVote, onVote }: { bid: Bid; votes: number; leading: boolean; mine: boolean; canVote: boolean; onVote: () => void }) {
  return (
    <div style={{ borderRadius: 16, padding: 16, background: mine ? "rgba(168,85,247,0.05)" : "var(--fill-1)", border: "1.5px solid " + (mine ? "rgba(168,85,247,0.5)" : leading ? "rgba(168,85,247,0.3)" : "var(--hair-2)"), position: "relative", display: "flex", flexDirection: "column", gap: 12 }}>
      {(bid.recommended || leading) && (
        <span style={{ position: "absolute", top: -9, left: 14, fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 99, color: leading ? "#0a0a0a" : PURPLE, background: leading ? PURPLE : "rgba(168,85,247,0.15)", border: leading ? "none" : "1px solid rgba(168,85,247,0.3)" }}>{leading ? "LEADING" : "MANAGER PICK"}</span>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{bid.vendor}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: bid.grade >= 90 ? "#22c55e" : "#f59e0b" }}><Icon name="star" size={11} color={bid.grade >= 90 ? "#22c55e" : "#f59e0b"} />{bid.grade}</span>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: "var(--ink)" }}>{moneyFull(bid.amount)}</div>
      <div style={{ display: "flex", gap: 14 }}>
        <Spec icon="clock" v={bid.leadTimeDays + "d"} l="lead" />
        <Spec icon="shield" v={bid.warrantyMo + "mo"} l="warranty" />
        <Spec icon="vote" v={"" + votes} l="votes" />
      </div>
      <p style={{ margin: 0, fontFamily: SANS, fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{bid.scope}. {bid.note}</p>
      {canVote ? (
        mine ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 9, borderRadius: 10, background: "rgba(168,85,247,0.12)", color: PURPLE, fontFamily: MONO, fontSize: 10, fontWeight: 700 }}><Icon name="check" size={13} color={PURPLE} />YOUR VOTE</div>
        ) : (
          <Btn small icon="vote" onClick={onVote} style={{ width: "100%", justifyContent: "center" }}>Vote for this</Btn>
        )
      ) : null}
    </div>
  );
}

function Spec({ icon, v, l }: { icon: string; v: string; l: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: SANS, fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}><Icon name={icon} size={12} color="var(--ink-4)" />{v}</span>
      <span style={{ fontFamily: MONO, fontSize: 8, color: "var(--ink-4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{l}</span>
    </div>
  );
}
