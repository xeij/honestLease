import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";

const MAX_BYTES = 20 * 1024 * 1024;

interface Props {
  onFile: (file: File) => void;
}

export function DropZone({ onFile }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (file.type !== "application/pdf") return "Please upload a PDF file.";
    if (file.size > MAX_BYTES) return "File must be under 20MB.";
    return null;
  }

  function handleFile(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    onFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#3b82f6" : "#d1d5db"}`,
        borderRadius: 8,
        padding: "2rem",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "#eff6ff" : "#f9fafb",
      }}
    >
      <p>Drag &amp; drop your lease PDF here, or click to select</p>
      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Lease documents only · max size 20 megabytes</p>
      {error && <p style={{ color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={onChange}
      />
    </div>
  );
}
