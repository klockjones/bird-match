import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { removeEventPlayer } from "@/app/dashboard/[eventId]/players/actions";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SummaryCard } from "@/components/ui/summary-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";
import { getDoublesTypeLabel, getEffectiveTeam, getMatchPlayerLabel } from "@/lib/utils/player-display";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

function getIdentitySortKey(player: PlayerItem): string {
  return player.name || player.english_id || "";
}

type EventPlayersPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    added?: string;
    removed?: string;
    error?: string;
    team?: string;
    sort?: string;
    q?: string;
  }>;
};

const UNASSIGNED_TEAM = "__unassigned__";

function buildParticipantsHref(current: { team?: string; sort?: string; q?: string }, overrides: { team?: string; sort?: string; q?: string }) {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  if (merged.team) params.set("team", merged.team);
  if (merged.sort) params.set("sort", merged.sort);
  if (merged.q) params.set("q", merged.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

type EventPlayerRow = {
  id: string;
  team: string | null;
  seed: number | null;
  note: string | null;
  created_at: string;
  players: PlayerItem | PlayerItem[] | null;
};

export default async function EventPlayersPage({ params, searchParams }: EventPlayersPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: event, error: eventError }, { data: eventPlayers, error: eventPlayersError }, { data: matchRows }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase
      .from("event_players")
      .select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select("match_no,round_name,court_no,match_players(player_id,side,players(gender))")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;
  type PlayerMatchInfo = { matchNo: number; roundName: string | null; courtNo: string | null; doublesType: string };
  type MatchPlayerRow = { player_id: string; side: "A" | "B"; players: { gender: string | null } | { gender: string | null }[] | null };
  const matchCountByPlayer = new Map<string, number>();
  const matchInfoByPlayer = new Map<string, PlayerMatchInfo[]>();
  (matchRows ?? []).forEach((match) => {
    const row = match as { match_no: number; round_name: string | null; court_no: string | null; match_players: MatchPlayerRow[] | null };
    const slots = row.match_players ?? [];
    slots.forEach((slot) => {
      matchCountByPlayer.set(slot.player_id, (matchCountByPlayer.get(slot.player_id) ?? 0) + 1);
      const sidePlayers = slots
        .filter((other) => other.side === slot.side)
        .map((other) => (Array.isArray(other.players) ? other.players[0] : other.players) ?? { gender: null });
      const info = matchInfoByPlayer.get(slot.player_id) ?? [];
      info.push({ matchNo: row.match_no, roundName: row.round_name, courtNo: row.court_no, doublesType: getDoublesTypeLabel(sidePlayers) });
      matchInfoByPlayer.set(slot.player_id, info);
    });
  });
  const participantList = ((eventPlayers ?? []) as EventPlayerRow[])
    .map((item) => {
      const player = Array.isArray(item.players) ? item.players[0] : item.players;
      if (!player) return null;
      return {
        id: item.id,
        team: item.team,
        seed: item.seed,
        note: item.note,
        created_at: item.created_at,
        player,
      } satisfies EventPlayerItem;
    })
    .filter((item): item is EventPlayerItem => Boolean(item));
  const team1Count = detail.team_label_1 ? participantList.filter((item) => item.team === detail.team_label_1).length : 0;
  const team2Count = detail.team_label_2 ? participantList.filter((item) => item.team === detail.team_label_2).length : 0;
  const unassignedCount = participantList.filter((item) => !getEffectiveTeam(item)).length;

  const teamOptions = [...new Set(participantList.map((item) => getEffectiveTeam(item)).filter((team): team is string => Boolean(team)))];
  const selectedTeam = query?.team && (query.team === UNASSIGNED_TEAM || teamOptions.includes(query.team)) ? query.team : null;
  const sortOrder = query?.sort === "name" ? query.sort : "team";
  const searchTerm = query?.q?.trim().toLowerCase() ?? "";

  const visibleParticipants = participantList
    .filter((item) => {
      if (!selectedTeam) return true;
      if (selectedTeam === UNASSIGNED_TEAM) return !getEffectiveTeam(item);
      return getEffectiveTeam(item) === selectedTeam;
    })
    .filter((item) => !searchTerm || getMatchPlayerLabel(item.player).toLowerCase().includes(searchTerm))
    .sort((left, right) => {
      if (sortOrder === "name") return getMatchPlayerLabel(left.player).localeCompare(getMatchPlayerLabel(right.player), "ko");
      const teamCompare = (getEffectiveTeam(left) ?? "").localeCompare(getEffectiveTeam(right) ?? "", "ko");
      if (teamCompare !== 0) return teamCompare;
      return getIdentitySortKey(left.player).localeCompare(getIdentitySortKey(right.player), "ko");
    });

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>참가 명단 관리</h1>
        <p className="surface-copy" style={{ margin: 0 }}>{detail.title} 일정의 참가자 명단입니다.</p>
      </div>

      {query?.added ? <p className="admin-inline-message success">참가자가 추가되었습니다.</p> : null}
      {query?.removed ? <p className="admin-inline-message success">참가자가 삭제되었습니다.</p> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {eventPlayersError ? <p className="admin-inline-message error">참가 명단을 불러오지 못했습니다: {eventPlayersError.message}</p> : null}

      <section className="participant-summary-grid">
        <SummaryCard label="전체 참가자" value={participantList.length} />
        {detail.event_type === "blue_white" ? <SummaryCard label={detail.team_label_1 ?? "팀1"} value={team1Count} /> : null}
        {detail.event_type === "blue_white" ? <SummaryCard label={detail.team_label_2 ?? "팀2"} value={team2Count} /> : null}
        <SummaryCard label="팀 미지정" value={unassignedCount} />
      </section>

      <section className="admin-stack">
        <SectionHeader title="현재 참가자" description="같은 선수는 동일 일정에 한 번만 추가됩니다." />
        <Link href={`/dashboard/${eventId}/players/new`} className="event-launcher-link">참가 명단 추가 (수동입력)</Link>

        <form method="GET" className="participant-search-row">
          <input type="hidden" name="team" value={selectedTeam ?? ""} />
          <input type="hidden" name="sort" value={sortOrder === "team" ? "" : sortOrder} />
          <input type="search" name="q" defaultValue={query?.q ?? ""} placeholder="이름 또는 LDAP로 검색" aria-label="참가자 이름 또는 LDAP 검색" />
          <button type="submit" className="primary-button">검색</button>
        </form>

        <div className="filter-pill-row">
          <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { sort: undefined })} className={`filter-pill${sortOrder === "team" ? " active" : ""}`}>팀순</a>
          <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { sort: "name" })} className={`filter-pill${sortOrder === "name" ? " active" : ""}`}>이름순</a>
        </div>

        {teamOptions.length > 0 ? (
          <div className="filter-pill-row">
            <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { team: undefined })} className={`filter-pill${selectedTeam ? "" : " active"}`}>전체 팀</a>
            {teamOptions.map((team) => (
              <a key={team} href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { team })} className={`filter-pill${selectedTeam === team ? " active" : ""}`}>
                {team}
              </a>
            ))}
            <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { team: UNASSIGNED_TEAM })} className={`filter-pill${selectedTeam === UNASSIGNED_TEAM ? " active" : ""}`}>미지정</a>
          </div>
        ) : null}

        {visibleParticipants.length === 0 ? (
          <EmptyStateCard message={participantList.length === 0 ? "아직 참가자가 없습니다." : "조건에 맞는 참가자가 없습니다."} />
        ) : (
          <div className="admin-stack">
            {visibleParticipants.map((participant) => {
              const effectiveTeam = getEffectiveTeam(participant);
              return (
                <article key={participant.id} className="participant-card">
                  <div className="participant-card-top">
                    <div className="player-team-stack">
                      <div className="player-primary-text">
                        {effectiveTeam ? <span className="team-dot" style={getTeamAccentStyle(effectiveTeam)} title={effectiveTeam} aria-label={effectiveTeam} /> : null}
                        {getMatchPlayerLabel(participant.player)}
                      </div>
                    </div>
                    <div className="participant-meta-row">
                      <span className={`participant-info-chip${participant.player.gender ? "" : " chip-muted"}`}>{participant.player.gender ?? "구분 미정"}</span>
                      <span className={`participant-info-chip${participant.player.national_level ? "" : " chip-muted"}`}>전국 {participant.player.national_level ?? "미지정"}</span>
                      <span className={`participant-info-chip${participant.player.regional_level ? "" : " chip-muted"}`}>지역 {participant.player.regional_level ?? "미지정"}</span>
                      <span className={`participant-info-chip${matchCountByPlayer.get(participant.player.id) ? "" : " chip-muted"}`}>경기 {matchCountByPlayer.get(participant.player.id) ?? 0}</span>
                      {participant.player.phone ? <span className="participant-info-chip">{participant.player.phone}</span> : null}
                    </div>
                  </div>
                  {(matchInfoByPlayer.get(participant.player.id) ?? []).length > 0 ? (
                    <div className="participant-meta-row">
                      {(matchInfoByPlayer.get(participant.player.id) ?? []).map((info) => (
                        <span key={info.matchNo} className="participant-info-chip">
                          {info.roundName ?? "라운드 미정"} · {info.courtNo ?? "코트 미정"} · {info.doublesType} ({info.matchNo}경기)
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {participant.note ? <div className="participant-note-card"><p className="player-secondary-text" style={{ margin: 0 }}>{participant.note}</p></div> : null}
                  <form action={removeEventPlayer} style={{ justifySelf: "end" }}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="participantId" value={participant.id} />
                    <HoldToConfirmButton
                      className="danger-button"
                      label="꾹 눌러서 참가자 삭제"
                      holdingLabel="손을 떼면 취소돼요..."
                      pendingLabel="삭제 중..."
                    />
                  </form>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
