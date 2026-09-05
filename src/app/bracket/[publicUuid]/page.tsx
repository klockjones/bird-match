import { notFound } from "next/navigation";
import { AutoRefreshControl } from "@/components/bracket/auto-refresh-control";
import { MatchCardFlash } from "@/components/bracket/match-card-flash";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { PlayerItem } from "@/lib/types/player";
import { formatDateOnly, formatDateTime, formatTimeOnly } from "@/lib/utils/format-date";
import { getMatchPlayerLabel } from "@/lib/utils/player-display";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type BracketPageProps = {
  params: Promise<{
    publicUuid: string;
  }>;
  searchParams?: Promise<{
    court?: string;
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
        "id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at))",
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

  const finishedCount = matchList.filter((match) => match.status === "done").length;
  const waitingCount = matchList.length - finishedCount;
  const nextMatchId = matchList.find((match) => match.status !== "done")?.id ?? null;

  const courtOptions = [...new Set(matchList.map((match) => match.court_no).filter((court): court is string => Boolean(court)))];
  const selectedCourt = query?.court && courtOptions.includes(query.court) ? query.court : null;
  const visibleMatches = selectedCourt ? matchList.filter((match) => match.court_no === selectedCourt) : matchList;

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
        <div className="matchboard-hero-top">
          <div>
            <h1 className="matchboard-title">{detail.title}</h1>
            <p className="matchboard-subtitle">
              {detail.location ?? "장소 미정"} · {detail.event_date ?? "날짜 미정"}
            </p>
            <div className="matchboard-stat-grid" style={{ marginTop: 18 }}>
              <div className="matchboard-stat-card">전체 경기 수: {matchList.length}</div>
              <div className="matchboard-stat-card">대기 경기 수: {waitingCount}</div>
              <div className="matchboard-stat-card">완료 경기 수: {finishedCount}</div>
            </div>
          </div>
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

      <AutoRefreshControl intervalSeconds={15} />

      <section className="queue-section">
        <div>
          <h2 className="surface-title">경기 현황</h2>
          <p className="surface-copy">
            코트 기준 경기들을 순서대로 보여줍니다.{sharedDate ? ` 날짜: ${sharedDate}` : ""}
          </p>
        </div>

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
          <div className="empty-card">표시할 경기가 없습니다.</div>
        ) : (
          <div className="matchboard-queue-grid">
            {visibleMatches.map((match) => {
              const isNext = match.id === nextMatchId;

              return (
                <MatchCardFlash
                  key={match.id}
                  className={`match-card${isNext ? " current" : ""}`}
                  team1Score={match.team1_score}
                  team2Score={match.team2_score}
                  status={match.status}
                >
                  <div className="match-line">
                    <div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <h3 className="match-heading">{match.match_no} 경기</h3>
                        <span className="match-meta-chip">{match.court_no ?? "코트 미정"}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`status-chip ${isNext ? "next" : match.status === "done" ? "done" : "waiting"}`}>
                        {isNext ? "다음 경기" : getMatchStatusLabel(match.status)}
                      </span>
                      <div className="muted-text" style={{ marginTop: 8 }}>
                        {sharedDate ? formatTimeOnly(match.scheduled_at) : formatDateTime(match.scheduled_at)}
                      </div>
                    </div>
                  </div>

                  <div className="match-side-line">
                    <div className="pair-unit">
                      <div className="pair-row">
                        <div className="pair-badge-slot">
                          {match.status === "done" && match.winner_side === "A" ? <span className="pair-win-badge">승</span> : null}
                        </div>
                        <div className="pair-left">
                          <div className="pair-group">
                          {getSidePlayers(match, "A").map((slot) => (
                            <div key={`queue-a-${match.id}-${slot.player.id}-${slot.position}`} className="pair-player-card">
                              <strong className="player-primary-text pair-player-name">{getMatchPlayerLabel(slot.player)}</strong>
                              <span className="team-caption" style={getTeamAccentStyle(playerTeamMap.get(slot.player.id) ?? teamLabel1)}>{playerTeamMap.get(slot.player.id) ?? teamLabel1}</span>
                            </div>
                          ))}
                          </div>
                        </div>
                        <span className="match-side-score">{match.status === "done" ? match.team1_score : "–"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="match-side-line">
                    <div className="pair-unit">
                      <div className="pair-row">
                        <div className="pair-badge-slot">
                          {match.status === "done" && match.winner_side === "B" ? <span className="pair-win-badge">승</span> : null}
                        </div>
                        <div className="pair-left">
                          <div className="pair-group">
                          {getSidePlayers(match, "B").map((slot) => (
                            <div key={`queue-b-${match.id}-${slot.player.id}-${slot.position}`} className="pair-player-card">
                              <strong className="player-primary-text pair-player-name">{getMatchPlayerLabel(slot.player)}</strong>
                              <span className="team-caption" style={getTeamAccentStyle(playerTeamMap.get(slot.player.id) ?? teamLabel2)}>{playerTeamMap.get(slot.player.id) ?? teamLabel2}</span>
                            </div>
                          ))}
                          </div>
                        </div>
                        <span className="match-side-score">{match.status === "done" ? match.team2_score : "–"}</span>
                      </div>
                    </div>
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
