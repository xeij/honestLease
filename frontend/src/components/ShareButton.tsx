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
        background: copied ? "#16a34a" : "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: 6,
        padding: "0.6rem 1.25rem",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "0.9rem",
        transition: "background 0.15s",
      }}
    >
      {copied ? "Link copied!" : "Copy shareable link"}
    </button>
  );
}
