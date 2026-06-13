// Icon — Lucide wrapper that accepts the kebab-case names used throughout the
// data layer (e.g. "layout-dashboard"). Maps to PascalCase exports, with a few
// aliases for icons renamed across Lucide versions. Stroke-based, no fill.
import * as Lucide from "lucide-react";
import type { CSSProperties } from "react";

// renamed across Lucide majors — keep the prototype's names working
const ALIASES: Record<string, string> = {
  "check-circle-2": "CircleCheckBig",
  "check-circle": "CircleCheck",
  "shield": "Shield",
  "chevrons-up-down": "ChevronsUpDown",
};

const toPascal = (name: string): string =>
  name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, color = "currentColor", strokeWidth = 2, className, style }: IconProps) {
  const key = ALIASES[name] || toPascal(name);
  const Cmp = (Lucide as unknown as Record<string, Lucide.LucideIcon>)[key] || Lucide.Circle;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} className={className} style={{ display: "inline-flex", ...style }} />;
}
