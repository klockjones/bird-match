import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefreshControl } from "@/components/bracket/auto-refresh-control";
import { MatchCardFlash } from "@/components/bracket/match-card-flash";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { PlayerItem } from "@/lib/types/player";
import { formatDateOnly, formatDateTime, formatTimeOnly } from "@/lib/utils/format-date";
import { getDoublesTypeLabel, getPlayerIdentity } from "@/lib/utils/player-display";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type BracketPageProps = {
  params: Promise<{
    publicUuid: string;
  }>;
  searchParams?: Promise<{
    court?: string;
    status?: string;
  }>;
};

type MatchRow = Omit<MatchItem, "match_players"> & {
  match_players: Array<{
    side: "A" | "B";
    position: number;
    players: PlayerItem | PlayerItem[] | null;
  }>;
};

type EventPlayerTeamRow = {
  team: string | null;
  player_id: string;
};

function getSidePlayers(match: MatchItem, side: "A" | "B") {
  return match.match_players.filter((slot) => slot.side === side);
}

export default async function BracketPage({ params, searchParams }: BracketPageProps) {
  const { publicUuid } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
    .eq("public_uuid", publicUuid)
    .eq("is_public", true)
    .single();

  if (eventError || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;
  const [{ data: matches, error: matchesError }, { data: eventPlayers }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,affiliation,english_id,national_level,regional_level,is_active,created_at))",
      )
      .eq("event_id", detail.id)
      .order("sort_order", { ascending: true })
      .order("match_no", { ascending: true }),
    supabase.from("event_players").select("team,player_id").eq("event_id", detail.id),
  ]);

  if (matchesError) {
    notFound();
  }

  const playerTeamMap = new Map(
    ((eventPlayers ?? []) as EventPlayerTeamRow[]).map((item) => [item.player_id, item.team]),
  );
  const distinctTeamNames = [
    ...new Set(
      ((eventPlayers ?? []) as EventPlayerTeamRow[])
        .map((item) => item.team)
        .filter((team): team is string => typeof team === "string" && team.length > 0),
    ),
  ];

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

  const roundCount = new Set(matchList.map((match) => match.round_name).filter(Boolean)).size;

  const courtOptions = [...new Set(matchList.map((match) => match.court_no).filter((court): court is string => Boolean(court)))];
  const selectedCourt = query?.court && courtOptions.includes(query.court) ? query.court : null;
  const selectedStatus = query?.status === "waiting" || query?.status === "done" ? query.status : null;
  const courtFilteredMatches = matchList.filter((match) => !selectedCourt || match.court_no === selectedCourt);
  const finishedCount = courtFilteredMatches.filter((match) => match.status === "done").length;
  const cancelledCount = courtFilteredMatches.filter((match) => match.status === "cancelled").length;
  const waitingCount = courtFilteredMatches.length - finishedCount - cancelledCount;
  const visibleMatches = courtFilteredMatches.filter((match) => !selectedStatus || match.status === selectedStatus);

  const statusQuery = (value: string) => {
    const params = new URLSearchParams();
    if (selectedCourt) params.set("court", selectedCourt);
    if (value !== "all") params.set("status", value);
    const search = params.toString();
    return search ? `?${search}` : "?";
  };

  const courtQuery = (value: string | null) => {
    const params = new URLSearchParams();
    if (value) params.set("court", value);
    if (selectedStatus) params.set("status", selectedStatus);
    const search = params.toString();
    return search ? `?${search}` : "?";
  };

  const scheduledDates = new Set(
    matchList.map((match) => (match.scheduled_at ? formatDateOnly(match.scheduled_at) : null)).filter((value): value is string => Boolean(value)),
  );
  const sharedDate = scheduledDates.size === 1 ? [...scheduledDates][0] : null;

  const teamLabel1 = detail.team_label_1 ?? distinctTeamNames[0] ?? "팀 1";
  const teamLabel2 = detail.team_label_2 ?? distinctTeamNames[1] ?? "팀 2";
  let team1Wins = 0;
  let team2Wins = 0;

  if (detail.event_type === "blue_white") {
    matchList.forEach((match) => {
      if (!match.winner_side) return;
      const winners = match.match_players.filter((slot) => slot.side === match.winner_side);
      const teams = new Set(winners.map((slot) => playerTeamMap.get(slot.player.id)).filter(Boolean));
      if (teams.size !== 1) return;
      const [team] = [...teams];
      if (team === teamLabel1) team1Wins += 1;
      if (team === teamLabel2) team2Wins += 1;
    });
  }

  return (
    <main className="page-shell matchboard-shell">
      <section className="matchboard-hero">
        <h1 className="matchboard-title">{detail.title}</h1>
        <p className="matchboard-date">{detail.event_date ?? "날짜 미정"}</p>
        <p className="matchboard-subtitle">
          {detail.location ?? "장소 미정"} · {matchList.length}경기 · {roundCount}라운드
        </p>
        {detail.status === "closed" ? <span className="matchboard-closed-badge">경기 종료</span> : null}
        <div className="matchboard-hero-actions">
          <Link href="/login" className="matchboard-operator-link">운영자 모드</Link>
        </div>

        {detail.event_type === "blue_white" ? (
          <div className="matchboard-team-score-grid">
            <div className="matchboard-team-score-card blue">
              <span className="team-score-label">{teamLabel1} 승수</span>
              <span className="team-score-value">{team1Wins}</span>
            </div>
            <div className="matchboard-team-score-card white">
              <span className="team-score-label">{teamLabel2} 승수</span>
              <span className="team-score-value">{team2Wins}</span>
            </div>
          </div>
        ) : null}
      </section>

      {detail.status === "closed" ? null : <AutoRefreshControl intervalSeconds={10} />}

      <section className="queue-section">
        {courtOptions.length > 1 ? (
          <div className="filter-pill-row">
            <a href={courtQuery(null)} className={`filter-pill${selectedCourt ? "" : " active"}`}>전체 코트</a>
            {courtOptions.map((court) => (
              <a key={court} href={courtQuery(court)} className={`filter-pill${selectedCourt === court ? " active" : ""}`}>
                {court}
              </a>
            ))}
          </div>
        ) : null}

        <div className="filter-pill-row">
          <a href={statusQuery("all")} className={`filter-pill${selectedStatus ? "" : " active"}`}>전체 {courtFilteredMatches.length}</a>
          <a href={statusQuery("waiting")} className={`filter-pill${selectedStatus === "waiting" ? " active" : ""}`}>대기 {waitingCount}</a>
          <a href={statusQuery("done")} className={`filter-pill${selectedStatus === "done" ? " active" : ""}`}>완료 {finishedCount}</a>
        </div>

        {visibleMatches.length === 0 ? (
          <div className="empty-card">표시할 경기가 없습니다.</div>
        ) : (
          <div className="matchboard-queue-grid">
            {visibleMatches.map((match) => {
              const matchType = getDoublesTypeLabel(match.match_players.map((slot) => slot.player));
              const isDecided = match.status === "done" && Boolean(match.winner_side);

              return (
                <MatchCardFlash
                  key={match.id}
                  className="match-card"
                  team1Score={match.team1_score}
                  team2Score={match.team2_score}
                  status={match.status}
                >
                  <div className="match-row-header">
                    {match.round_name ? <span className="match-tag">{match.round_name}</span> : null}
                    <span className="match-tag">GAME {String(match.match_no).padStart(2, "0")}</span>
                    <span className="match-tag type">{matchType}</span>
                    <span className="match-tag">{match.court_no ?? "코트 미정"}</span>
                    <span className="match-row-time">{sharedDate ? formatTimeOnly(match.scheduled_at) : formatDateTime(match.scheduled_at)}</span>
                    <span className={`status-chip ${match.status}`}>
                      {getMatchStatusLabel(match.status)}
                    </span>
                  </div>

                  <div className={`match-row-side${match.winner_side === "A" ? " won" : isDecided ? " lost" : ""}`}>
                    <span className="side-badge">A</span>
                    <span className="side-names">
                      {getSidePlayers(match, "A").map((slot) => (
                        <span key={slot.player.id} className="side-player">
                          <span className="team-dot" style={getTeamAccentStyle(slot.player.affiliation)} aria-hidden />
                          <span className="side-player-name">{getPlayerIdentity(slot.player)}</span>
                          {slot.player.affiliation ? <span className="side-player-team">{slot.player.affiliation}</span> : null}
                        </span>
                      ))}
                    </span>
                    {match.status === "done" && match.winner_side === "A" ? <span className="win-tag">승</span> : null}
                    <span className="side-score">{match.status === "done" ? match.team1_score : "–"}</span>
                  </div>
                  <div className={`match-row-side${match.winner_side === "B" ? " won" : isDecided ? " lost" : ""}`}>
                    <span className="side-badge">B</span>
                    <span className="side-names">
                      {getSidePlayers(match, "B").map((slot) => (
                        <span key={slot.player.id} className="side-player">
                          <span className="team-dot" style={getTeamAccentStyle(slot.player.affiliation)} aria-hidden />
                          <span className="side-player-name">{getPlayerIdentity(slot.player)}</span>
                          {slot.player.affiliation ? <span className="side-player-team">{slot.player.affiliation}</span> : null}
                        </span>
                      ))}
                    </span>
                    {match.status === "done" && match.winner_side === "B" ? <span className="win-tag">승</span> : null}
                    <span className="side-score">{match.status === "done" ? match.team2_score : "–"}</span>
                  </div>
                </MatchCardFlash>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
