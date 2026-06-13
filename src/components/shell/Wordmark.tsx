// Orbit wordmark — orbital glyph + "ORBIT FC" (900 italic / 300 normal).
export function OrbitWordmark({ small }: { small?: boolean }) {
  const d = small ? 30 : 38;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: d, height: d, position: "relative", flexShrink: 0 }}>
        <svg viewBox="0 0 38 38" width={d} height={d}>
          <circle cx="19" cy="19" r="17" fill="none" stroke="var(--acc)" strokeWidth="1.2" opacity="0.35" />
          <ellipse cx="19" cy="19" rx="17" ry="6.5" fill="none" stroke="var(--acc)" strokeWidth="1.2" opacity="0.7" transform="rotate(-28 19 19)" />
          <circle cx="19" cy="19" r="5" fill="var(--acc)" />
          <circle cx="19" cy="19" r="5" fill="var(--acc)" style={{ filter: "blur(4px)", opacity: 0.6 }} />
          <circle cx="33" cy="13" r="2" fill="var(--acc)" />
        </svg>
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 900, fontStyle: "italic", fontSize: small ? 16 : 19, letterSpacing: "-0.5px", color: "var(--ink)" }}>
          ORBIT<span style={{ fontWeight: 300, fontStyle: "normal", color: "var(--acc-text)", marginLeft: 5 }}>FC</span>
        </div>
        {!small && <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: "0.3em", color: "var(--ink-4)", marginTop: 3, textTransform: "uppercase" }}>Facilities Command</div>}
      </div>
    </div>
  );
}
