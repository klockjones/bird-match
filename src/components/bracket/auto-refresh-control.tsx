"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AutoRefreshControlProps = {
  intervalSeconds?: number;
};

export function AutoRefreshControl({ intervalSeconds = 15 }: AutoRefreshControlProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
        setLastRefreshedAt(new Date());
      });
    }, intervalSeconds * 1000);

    return () => window.clearInterval(timer);
  }, [enabled, intervalSeconds, router]);

  const label = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(lastRefreshedAt),
    [lastRefreshedAt],
  );

  return (
    <div className="surface-subcard" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <strong>자동 새로고침</strong>
          <div className="muted-text" style={{ marginTop: 6 }}>
            {intervalSeconds}초마다 공개 보드를 다시 불러옵니다.
          </div>
        </div>

        <button type="button" onClick={() => setEnabled((value) => !value)}>
          {enabled ? "자동 새로고침 끄기" : "자동 새로고침 켜기"}
        </button>
      </div>

      <div className="muted-text">
        마지막 새로고침: {label}
        {isPending ? " · 갱신 중" : ""}
      </div>
    </div>
  );
}
