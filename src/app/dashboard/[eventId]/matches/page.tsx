import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteAllMatches } from "@/app/dashboard/[eventId]/matches/actions";
import { QuickScoreForm } from "@/components/dashboard/quick-score-form";
import { UpdateMatchForm } from "@/components/dashboard/update-match-form";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { Toast } from "@/components/ui/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";
import { formatDateTime } from "@/lib/utils/format-date";
import { getDoublesTypeLabel, getMatchPlayerLabel } from "@/lib/utils/player-display";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type EventMatchesPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ created?: string; updated?: string; deleted?: string; deletedAll?: string; error?: string; t?: string; court?: string }>;
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
    supabase.from("event_players").select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at)").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("matches").select("id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at))").eq("event_id", eventId).order("sort_order", { ascending: true }).order("match_no", { ascending: true }),
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
  const courtOptions = [...new Set(matchList.map((match) => match.court_no).filter((court): court is string => Boolean(court)))];
  const selectedCourt = query?.court && courtOptions.includes(query.court) ? query.court : null;
  const visibleMatches = selectedCourt ? matchList.filter((match) => match.court_no === selectedCourt) : matchList;
  const successMessage = query?.created
    ? "경기가 생성되었습니다."
    : query?.updated
      ? "경기 상태와 점수가 저장되었습니다."
      : query?.deleted
        ? "경기가 삭제되었습니다."
        : query?.deletedAll
          ? "등록된 경기를 모두 삭제했습니다."
          : null;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>경기 관리</h1>
      </div>

      {successMessage ? <Toast key={query?.t} message={successMessage} /> : null}
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

        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}/matches/new`} className="event-launcher-link">경기 생성</Link>
          <Link href={`/dashboard/${eventId}/matches/auto`} className="event-launcher-link">대진표 자동 생성</Link>
        </div>

        {matchList.length > 0 ? (
          <form action={deleteAllMatches} style={{ justifySelf: "start" }}>
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="publicUuid" value={detail.public_uuid} />
            <HoldToConfirmButton
              className="danger-button"
              label={`꾹 눌러서 등록된 경기 ${matchList.length}건 일괄 삭제`}
              holdingLabel="손을 떼면 취소돼요..."
              pendingLabel="삭제 중..."
            />
          </form>
        ) : null}

        {courtOptions.length > 1 ? (
          <div className="filter-pill-row">
            <a href="?" className={`filter-pill${selectedCourt ? "" : " active"}`}>전체</a>
            {courtOptions.map((court) => (
              <a key={court} href={`?court=${encodeURIComponent(court)}`} className={`filter-pill${selectedCourt === court ? " active" : ""}`}>
                {court}
              </a>
            ))}
          </div>
        ) : null}

        {visibleMatches.length === 0 ? (
          <div className="empty-card">{matchList.length === 0 ? "아직 등록된 경기가 없습니다." : "선택한 코트에 경기가 없습니다."}</div>
        ) : (
          <div className="admin-stack">
            {visibleMatches.map((match) => {
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
                      <div className="muted-text">예정: {formatDateTime(match.scheduled_at)}</div>
                    </div>
                  </div>

                  <div className="admin-sides-grid">
                    <div className="admin-side-card">
                      <span className="admin-side-label">A측 ({getDoublesTypeLabel(sideAPlayers.map((slot) => slot.player))})</span>
                      {sideAPlayers.map((slot) => (
                        <div key={`match-a-${match.id}-${slot.player.id}-${slot.position}`} className="player-team-stack">
                          <div className="player-primary-text">{getMatchPlayerLabel(slot.player)}</div>
                          {participantTeamMap.get(slot.player.id) ? <span className="team-caption" style={getTeamAccentStyle(participantTeamMap.get(slot.player.id))}>{participantTeamMap.get(slot.player.id)}</span> : null}
                        </div>
                      ))}
                    </div>
                    <div className="admin-side-card">
                      <span className="admin-side-label">B측 ({getDoublesTypeLabel(sideBPlayers.map((slot) => slot.player))})</span>
                      {sideBPlayers.map((slot) => (
                        <div key={`match-b-${match.id}-${slot.player.id}-${slot.position}`} className="player-team-stack">
                          <div className="player-primary-text">{getMatchPlayerLabel(slot.player)}</div>
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
