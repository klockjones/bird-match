import Link from "next/link";
import { redirect } from "next/navigation";
import { deletePlayer, setPlayerActive } from "@/app/dashboard/players/actions";
import { CreatePlayerForm } from "@/components/dashboard/create-player-form";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlayerItem } from "@/lib/types/player";
import { getMatchPlayerLabel } from "@/lib/utils/player-display";

type PlayersPageProps = {
  searchParams?: Promise<{
    created?: string;
    deleted?: string;
    statusUpdated?: string;
    error?: string;
  }>;
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const [{ data: players, error }, { data: eventPlayers }, { data: currentUserProfile }] = await Promise.all([
    supabase
      .from("players")
      .select("id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("event_players").select("player_id"),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);

  const isAdmin = currentUserProfile?.role === "admin";
  const playerList = (players ?? []) as PlayerItem[];
  const nationalLevelOptions = [...new Set(playerList.map((player) => player.national_level).filter((value): value is string => Boolean(value)))];
  const regionalLevelOptions = [...new Set(playerList.map((player) => player.regional_level).filter((value): value is string => Boolean(value)))];

  const participationCountByPlayer = new Map<string, number>();
  (eventPlayers ?? []).forEach((row) => {
    participationCountByPlayer.set(row.player_id, (participationCountByPlayer.get(row.player_id) ?? 0) + 1);
  });

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href="/dashboard?home=1" className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ marginBottom: 8 }}>선수 마스터 관리</h1>
        <p style={{ margin: 0, color: "#475569" }}>모든 일정에서 재사용할 기본 선수 명단입니다.</p>
      </div>

      {params?.created ? <p style={{ color: "#166534" }}>선수가 등록되었습니다.</p> : null}
      {params?.deleted ? <p style={{ color: "#166534" }}>선수가 삭제되었습니다.</p> : null}
      {params?.statusUpdated ? <p style={{ color: "#166534" }}>선수 상태가 변경되었습니다.</p> : null}
      {params?.error ? <p style={{ color: "#b91c1c" }}>{params.error}</p> : null}
      {error ? <p style={{ color: "#b91c1c" }}>선수 목록을 불러오지 못했습니다: {error.message}</p> : null}

      <CreatePlayerForm nationalLevelOptions={nationalLevelOptions} regionalLevelOptions={regionalLevelOptions} />

      <section style={{ display: "grid", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>등록된 선수</h2>
          <p style={{ margin: 0, color: "#475569" }}>일정에 참가자를 붙이기 전 기준 데이터입니다.</p>
        </div>

        {playerList.length === 0 ? (
          <div style={{ padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>아직 등록된 선수가 없습니다.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {playerList.map((player) => {
              const participationCount = participationCountByPlayer.get(player.id) ?? 0;
              return (
                <article key={player.id} style={{ padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{getMatchPlayerLabel(player)}</h3>
                      <p style={{ margin: "8px 0 0", color: "#475569" }}>
                        {player.gender ?? "구분 미정"}
                      </p>
                      <p style={{ margin: "4px 0 0", color: "#475569" }}>
                        전국급수: {player.national_level ?? "미지정"} · 지역급수: {player.regional_level ?? "미지정"}
                      </p>
                      <p style={{ margin: "4px 0 0", color: "#475569" }}>참가 이력: {participationCount}건</p>
                    </div>
                    <div style={{ textAlign: "right", color: "#475569" }}>
                      <div>{player.phone ?? "연락처 없음"}</div>
                      <div>{player.is_active ? "활성" : "비활성"}</div>
                    </div>
                  </div>
                  {player.memo ? <p style={{ marginTop: 12, color: "#334155" }}>{player.memo}</p> : null}
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <form action={setPlayerActive}>
                      <input type="hidden" name="playerId" value={player.id} />
                      <input type="hidden" name="isActive" value={player.is_active ? "false" : "true"} />
                      <button type="submit" className="filter-pill">{player.is_active ? "비활성으로 전환" : "활성으로 전환"}</button>
                    </form>
                    {isAdmin && participationCount === 0 ? (
                      <form action={deletePlayer}>
                        <input type="hidden" name="playerId" value={player.id} />
                        <HoldToConfirmButton
                          className="danger-button"
                          label={`꾹 눌러서 '${getMatchPlayerLabel(player)}' 선수 삭제`}
                          holdingLabel="손을 떼면 취소돼요..."
                          pendingLabel="삭제 중..."
                        />
                      </form>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
