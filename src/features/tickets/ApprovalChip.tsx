import { APPROVAL_META, type ApprovalState } from "@/lib/ticket";
import { tint } from "@/lib/format";
import { Icon } from "@/components/ui";

export function ApprovalChip({ state, small }: { state: ApprovalState; small?: boolean }) {
  const m = APPROVAL_META[state];
  if (!m) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: small ? 8 : 9, letterSpacing: "0.1em", color: m.c, background: tint(m.c, 12), border: "1px solid " + tint(m.c, 28), padding: small ? "2px 6px" : "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
      <Icon name={m.icon} size={small ? 9 : 11} color={m.c} />
      {m.short}
    </span>
  );
}
