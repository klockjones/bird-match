"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshControlProps = {
  intervalSeconds?: number;
};

export function AutoRefreshControl({ intervalSeconds = 15 }: AutoRefreshControlProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [intervalSeconds, router]);

  return null;
}
