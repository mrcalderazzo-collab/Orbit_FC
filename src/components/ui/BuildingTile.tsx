// BuildingTile — monogram tile keyed on the building's accent. (Photo scenes
// from the prototype are a later asset-pipeline task; monogram is the fallback.)
import type { Building } from "@/lib/types";
import { MONO } from "./primitives";

export function BuildingTile({ b, size = 44, radius = 12 }: { b: Building; size?: number; radius?: number }) {
  const initials = b.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, position: "relative", overflow: "hidden", background: "linear-gradient(135deg, " + b.mono + "22, var(--panel))", border: "1px solid " + b.mono + "44", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--hair-2) 1px, transparent 1px)", backgroundSize: "100% " + size / 5 + "px", opacity: 0.5 }} />
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: size * 0.28, color: b.mono, letterSpacing: "-0.5px", zIndex: 1 }}>{initials}</span>
    </div>
  );
}
