interface Props {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div
      role="alert"
      style={{
        background: "rgba(248,81,73,0.1)",
        border: "1px solid rgba(248,81,73,0.4)",
        borderRadius: 6,
        padding: "0.75rem 1rem",
        color: "#f85149",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "0.5rem",
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss error"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#f85149",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}
