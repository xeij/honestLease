export function SummaryIntro({ intro }: { intro: string }) {
  return (
    <div
      style={{
        background: "#eff6ff",
        borderRadius: 8,
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <p style={{ margin: 0, color: "#1e40af", lineHeight: 1.7 }}>{intro}</p>
    </div>
  );
}
