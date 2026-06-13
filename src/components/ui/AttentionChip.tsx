import type { Attention } from "@/lib/attention";
import { ATTENTION_META } from "@/lib/attention";
import { Icon } from "./Icon";

export function AttentionChip({ attn, small }: { attn: Attention; small?: boolean }) {
  const m = ATTENTION_META[attn];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: small ? 8 : 9, letterSpacing: "0.06em", color: m.color, background: `color-mix(in srgb, ${m.color} 13%, transparent)`, border: `1px solid color-mix(in srgb, ${m.color} 30%, transparent)`, padding: small ? "2px 7px" : "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
      <Icon name={m.icon} size={small ? 9 : 11} color={m.color} />{m.short}
    </span>
  );
}
