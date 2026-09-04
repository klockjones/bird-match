"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type HoldToConfirmButtonProps = {
  label: string;
  holdingLabel: string;
  pendingLabel: string;
  className?: string;
  holdMs?: number;
};

export function HoldToConfirmButton({ label, holdingLabel, pendingLabel, className, holdMs = 900 }: HoldToConfirmButtonProps) {
  const { pending } = useFormStatus();
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function start(event: { currentTarget: HTMLButtonElement }) {
    if (pending || timerRef.current !== null) return;
    setHolding(true);
    const form = event.currentTarget.form;
    timerRef.current = window.setTimeout(() => {
      setHolding(false);
      clearTimer();
      form?.requestSubmit();
    }, holdMs);
  }

  function cancel() {
    setHolding(false);
    clearTimer();
  }

  return (
    <button
      type="button"
      className={`hold-confirm-button ${className ?? ""}`.trim()}
      disabled={pending}
      aria-busy={pending}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) start(event);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") cancel();
      }}
      style={{ ["--hold-ms" as string]: `${holdMs}ms` }}
    >
      <span className={`hold-confirm-fill ${holding ? "active" : ""}`} aria-hidden />
      <span className="hold-confirm-label">{pending ? pendingLabel : holding ? holdingLabel : label}</span>
    </button>
  );
}
