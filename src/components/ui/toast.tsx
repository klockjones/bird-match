"use client";

import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  tone?: "success" | "error";
  durationMs?: number;
};

export function Toast({ message, tone = "success", durationMs = 3200 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div className={`toast toast-${tone}`} role="status">
      {message}
    </div>
  );
}
