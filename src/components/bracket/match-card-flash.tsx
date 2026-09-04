"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type MatchCardFlashProps = {
  team1Score: number;
  team2Score: number;
  status: string;
  className?: string;
  children: ReactNode;
};

export function MatchCardFlash({ team1Score, team2Score, status, className, children }: MatchCardFlashProps) {
  const signature = `${team1Score}-${team2Score}-${status}`;
  const prevSignature = useRef<string | null>(null);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (prevSignature.current !== null && prevSignature.current !== signature) {
      setFlashing(true);
      const timer = window.setTimeout(() => setFlashing(false), 1600);
      prevSignature.current = signature;
      return () => window.clearTimeout(timer);
    }

    prevSignature.current = signature;
  }, [signature]);

  return <article className={`${className ?? ""}${flashing ? " match-card-flash" : ""}`}>{children}</article>;
}
