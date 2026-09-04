import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuickScoreForm } from "@/components/dashboard/quick-score-form";
import { UpdateMatchForm } from "@/components/dashboard/update-match-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type EventMatchesPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ created?: string; updated?: string; deleted?: string; error?: string }>;
};

type EventPlayerRow = {
  id: string;
  team: string | null;
  seed: number | null;
  note: string | null;
  created_at: string;
  players: PlayerItem | PlayerItem[] | null;
};

type MatchRow = Omit<MatchItem, "match_players"> & {
  match_players: Array<{
    side: "A" | "B";
    position: number;
    players: PlayerItem | PlayerItem[] | null;
  }>;
};

export default async function EventMatchesPage({ params, searchParams }: EventMatchesPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event, error: eventError }, { data: eventPlayers, error: eventPlayersError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase.from("events").select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at").eq("id", eventId).single(),
    supabase.from("event_players").select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,is_active,created_at)").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("matches").select("id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,phone,memo,is_active,created_at))").eq("event_id", eventId).order("sort_order", { ascending: true }).order("match_no", { ascending: true }),
  ]);

  if (eventError || !event) notFound();

  const detail = event as EventDetailItem;
  const participants = ((eventPlayers ?? []) as EventPlayerRow[])
    .map((item) => {
      const player = Array.isArray(item.players) ? item.players[0] : item.players;
      if (!player) return null;
      return { id: item.id, team: item.team, seed: item.seed, note: item.note, created_at: item.created_at, player } satisfies EventPlayerItem;
    })
    .filter((item): item is EventPlayerItem => Boolean(item));

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
  const waitingCount = matchList.filter((match) => match.status !== "done").length;
  const doneCount = matchList.filter((match) => match.status === "done").length;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>경기 관리</h1>
          <Link href={`/dashboard/${eventId}/matches/new`} className="primary-button" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            + 새 경기 생성
          </Link>
        </div>
      </div>

      {query?.created ? <p className="admin-inline-message success">경기가 생성되었습니다.</p> : null}
      {query?.updated ? <p className="admin-inline-message success">경기 상태와 점수가 저장되었습니다.</p> : null}
      {query?.deleted ? <p className="admin-inline-message success">경기가 삭제되었습니다.</p> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {eventPlayersError ? <p className="admin-inline-message error">참가자 목록을 불러오지 못했습니다: {eventPlayersError.message}</p> : null}
      {matchesError ? <p className="admin-inline-message error">경기 목록을 불러오지 못했습니다: {matchesError.message}</p> : null}

      <section className="admin-summary-grid">
        <article className="admin-summary-card">
          <span className="admin-summary-label">총 경기</span>
          <span className="admin-summary-value">{matchList.length}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">대기</span>
          <span className="admin-summary-value">{waitingCount}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">완료</span>
          <span className="admin-summary-value">{doneCount}</span>
        </article>
      </section>

      <section className="admin-stack">
        <div>
          <h2 style={{ marginBottom: 8 }}>등록된 경기</h2>
          <p className="surface-copy" style={{ margin: 0 }}>요약을 먼저 보고, 필요한 경기만 열어서 수정하는 흐름으로 운영합니다.</p>
        </div>

        {matchList.length === 0 ? (
          <div className="empty-card">아직 등록된 경기가 없습니다.</div>
        ) : (
          <div className="admin-stack">
            {matchList.map((match) => {
              const sideAPlayers = match.match_players.filter((slot) => slot.side === "A");
              const sideBPlayers = match.match_players.filter((slot) => slot.side === "B");
              const participantTeamMap = new Map(participants.map((participant) => [participant.player.id, participant.team]));

              return (
                <article key={match.id} className="admin-match-card">
                  <div className="admin-match-top">
                    <div>
                      <h3 className="admin-match-title">{match.match_no} 경기</h3>
                      <p className="admin-match-subtitle">
                        {match.round_name ?? "라운드 미정"} · {match.group_name ?? "조 미정"} · {match.court_no ?? "코트 미정"}
                      </p>
                    </div>
                    <div className="admin-meta-stack">
                      <span className={`status-chip ${match.status === "done" ? "done" : "waiting"}`}>{getMatchStatusLabel(match.status)}</span>
                      <div className="muted-text">예정: {match.scheduled_at ?? "미정"}</div>
                    </div>
                  </div>

                  <div className="admin-sides-grid">
                    <div className="admin-side-card">
                      <span className="admin-side-label">A측 복식조</span>
                      {sideAPlayers.map((slot) => (
                        <div key={`match-a-${match.id}-${slot.player.id}-${slot.position}`} className="player-team-stack">
                          <div className="player-primary-text">{slot.player.name}</div>
                          {participantTeamMap.get(slot.player.id) ? <span className="team-caption" style={getTeamAccentStyle(participantTeamMap.get(slot.player.id))}>{participantTeamMap.get(slot.player.id)}</span> : null}
                        </div>
                      ))}
                    </div>
                    <div className="admin-side-card">
                      <span className="admin-side-label">B측 복식조</span>
                      {sideBPlayers.map((slot) => (
                        <div key={`match-b-${match.id}-${slot.player.id}-${slot.position}`} className="player-team-stack">
                          <div className="player-primary-text">{slot.player.name}</div>
                          {participantTeamMap.get(slot.player.id) ? <span className="team-caption" style={getTeamAccentStyle(participantTeamMap.get(slot.player.id))}>{participantTeamMap.get(slot.player.id)}</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <QuickScoreForm event={detail} match={match} />

                  <UpdateMatchForm event={detail} match={match} participants={participants} />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
