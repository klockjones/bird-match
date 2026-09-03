import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { PlayerItem } from "@/lib/types/player";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type BracketPageProps = {
  params: Promise<{
    publicUuid: string;
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

function formatDate(value: string | null) {
  if (!value) return "미정";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSidePlayers(match: MatchItem, side: "A" | "B") {
  return match.match_players.filter((slot) => slot.side === side);
}

export default async function BracketPage({ params }: BracketPageProps) {
  const { publicUuid } = await params;
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
        "id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,phone,memo,is_active,created_at))",
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

      <section className="queue-section">
        <div>
          <h2 className="surface-title">경기 현황</h2>
          <p className="surface-copy">3코트 기준 경기들을 순서대로 보여줍니다.</p>
        </div>

        {matchList.length === 0 ? (
          <div className="empty-card">표시할 경기가 없습니다.</div>
        ) : (
          <div className="matchboard-queue-grid">
            {matchList.map((match) => (
              <article key={match.id} className="match-card">
                <div className="match-line">
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                      <h3 className="match-heading">{match.match_no} 경기</h3>
                      <span className="match-meta-chip">{match.court_no ?? "코트 미정"}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`status-chip ${match.status === "done" ? "done" : "waiting"}`}>{getMatchStatusLabel(match.status)}</span>
                    <div className="muted-text" style={{ marginTop: 8 }}>{formatDate(match.scheduled_at)}</div>
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
                            <strong className="player-primary-text pair-player-name">{slot.player.name}</strong>
                            <span className="team-caption" style={getTeamAccentStyle(playerTeamMap.get(slot.player.id) ?? teamLabel1)}>{playerTeamMap.get(slot.player.id) ?? teamLabel1}</span>
                          </div>
                        ))}
                        </div>
                      </div>
                      <span className="match-side-score">{match.team1_score}</span>
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
                            <strong className="player-primary-text pair-player-name">{slot.player.name}</strong>
                            <span className="team-caption" style={getTeamAccentStyle(playerTeamMap.get(slot.player.id) ?? teamLabel2)}>{playerTeamMap.get(slot.player.id) ?? teamLabel2}</span>
                          </div>
                        ))}
                        </div>
                      </div>
                      <span className="match-side-score">{match.team2_score}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
