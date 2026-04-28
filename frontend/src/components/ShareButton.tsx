import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      style={{
        background: copied ? "rgba(63,185,80,0.15)" : "#1f6feb",
        color: copied ? "#3fb950" : "#e6edf3",
        border: copied ? "1px solid rgba(63,185,80,0.4)" : "1px solid #388bfd40",
        borderRadius: 6,
        padding: "0.6rem 1.25rem",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.9rem",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Link copied!" : "Copy shareable link"}
    </button>
  );
}
