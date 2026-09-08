import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { PlayerItem } from "@/lib/types/player";
import { formatDateTime } from "@/lib/utils/format-date";
import { getMatchPlayerLabel } from "@/lib/utils/player-display";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";

type PastMatchesPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ closed?: string }>;
};

type MatchRow = Omit<MatchItem, "match_players"> & {
  match_players: Array<{
    side: "A" | "B";
    position: number;
    players: PlayerItem | PlayerItem[] | null;
  }>;
};

export default async function PastMatchesPage({ params, searchParams }: PastMatchesPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event, error: eventError }, { data: matches, error: matchesError }, { data: allMatches }] = await Promise.all([
    supabase.from("events").select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at").eq("id", eventId).single(),
    supabase
      .from("matches")
      .select("id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at))")
      .eq("event_id", eventId)
      .in("status", ["done", "cancelled"])
      .order("sort_order", { ascending: true })
      .order("match_no", { ascending: true }),
    supabase.from("matches").select("id").eq("event_id", eventId),
  ]);

  if (eventError || !event) notFound();

  const detail = event as EventDetailItem;
  const totalMatchCount = (allMatches ?? []).length;
  const matchList = ((matches ?? []) as MatchRow[]).map((match) => ({
    ...match,
    match_players: match.match_players
      .map((slot) => {
        const player = Array.isArray(slot.players) ? slot.players[0] : slot.players;
        if (!player) return null;
        return { side: slot.side, position: slot.position, player } satisfies MatchPlayerSlot;
      })
      .filter((slot): slot is MatchPlayerSlot => Boolean(slot))
      .sort((left, right) => left.side.localeCompare(right.side) || left.position - right.position),
  })) as MatchItem[];
  const doneCount = matchList.filter((match) => match.status === "done").length;
  const cancelledCount = matchList.filter((match) => match.status === "cancelled").length;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>지난 경기</h1>
        <p className="surface-copy" style={{ margin: 0 }}>
          {detail.title} · {detail.event_date ?? "날짜 미정"} · {detail.location ?? "장소 미정"}
        </p>
      </div>

      {query?.closed ? <p className="admin-inline-message">종료된 일정이라 지난 경기로 연결했습니다. 참가자/경기를 다시 관리하려면 일정 관리에서 &quot;다시 열기&quot;를 눌러주세요.</p> : null}
      {matchesError ? <p className="admin-inline-message error">경기 목록을 불러오지 못했습니다: {matchesError.message}</p> : null}

      <section className="admin-summary-grid">
        <article className="admin-summary-card">
          <span className="admin-summary-label">전체 경기</span>
          <span className="admin-summary-value">{totalMatchCount}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">완료</span>
          <span className="admin-summary-value">{doneCount}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">취소</span>
          <span className="admin-summary-value">{cancelledCount}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">남은 경기</span>
          <span className="admin-summary-value">{totalMatchCount - matchList.length}</span>
        </article>
      </section>

      {matchList.length === 0 ? (
        <div className="empty-card">아직 지난 경기가 없습니다.</div>
      ) : (
        <div className="admin-stack">
          {matchList.map((match) => {
            const sideAPlayers = match.match_players.filter((slot) => slot.side === "A");
            const sideBPlayers = match.match_players.filter((slot) => slot.side === "B");

            return (
              <article key={match.id} className="admin-match-card">
                <div className="admin-match-top">
                  <div>
                    <h3 className="admin-match-title">{match.match_no} 경기</h3>
                    <p className="admin-match-subtitle">{match.court_no ?? "코트 미정"} · {formatDateTime(match.scheduled_at)}</p>
                  </div>
                  <div className="admin-meta-stack">
                    <span className={`status-chip ${match.status}`}>{getMatchStatusLabel(match.status)}</span>
                    {match.status === "done" ? <div className="muted-text">{match.team1_score} : {match.team2_score}</div> : null}
                  </div>
                </div>

                <div className="admin-sides-grid">
                  <div className="admin-side-card">
                    <span className="admin-side-label">A측{match.winner_side === "A" ? " · 승" : ""}</span>
                    {sideAPlayers.map((slot) => (
                      <div key={slot.player.id} className="player-primary-text">{getMatchPlayerLabel(slot.player)}</div>
                    ))}
                  </div>
                  <div className="admin-side-card">
                    <span className="admin-side-label">B측{match.winner_side === "B" ? " · 승" : ""}</span>
                    {sideBPlayers.map((slot) => (
                      <div key={slot.player.id} className="player-primary-text">{getMatchPlayerLabel(slot.player)}</div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
