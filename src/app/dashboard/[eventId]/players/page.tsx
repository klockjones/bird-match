import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddEventPlayerForm } from "@/components/dashboard/add-event-player-form";
import { CreateEventPlayerForm } from "@/components/dashboard/create-event-player-form";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SummaryCard } from "@/components/ui/summary-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type EventPlayersPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    added?: string;
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

  const [{ data: event, error: eventError }, { data: players, error: playersError }, { data: eventPlayers, error: eventPlayersError }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase
      .from("players")
      .select("id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("event_players")
      .select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;
  const playerList = (players ?? []) as PlayerItem[];
  const selectedPlayerIds = new Set(
    ((eventPlayers ?? []) as EventPlayerRow[])
      .map((item) => {
        const player = Array.isArray(item.players) ? item.players[0] : item.players;
        return player?.id;
      })
      .filter((value): value is string => Boolean(value)),
  );

  const availablePlayers = playerList.filter((player) => !selectedPlayerIds.has(player.id));
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
  const unassignedCount = participantList.filter((item) => !item.team).length;

  const teamOptions = [...new Set(participantList.map((item) => item.team).filter((team): team is string => Boolean(team)))];
  const nationalLevelOptions = [...new Set(participantList.map((item) => item.player.national_level).filter((value): value is string => Boolean(value)))];
  const regionalLevelOptions = [...new Set(participantList.map((item) => item.player.regional_level).filter((value): value is string => Boolean(value)))];
  const selectedTeam = query?.team && (query.team === UNASSIGNED_TEAM || teamOptions.includes(query.team)) ? query.team : null;
  const sortOrder = query?.sort === "name" || query?.sort === "seed" ? query.sort : "recent";
  const searchTerm = query?.q?.trim().toLowerCase() ?? "";

  const visibleParticipants = participantList
    .filter((item) => {
      if (!selectedTeam) return true;
      if (selectedTeam === UNASSIGNED_TEAM) return !item.team;
      return item.team === selectedTeam;
    })
    .filter((item) => !searchTerm || item.player.name.toLowerCase().includes(searchTerm))
    .sort((left, right) => {
      if (sortOrder === "name") return left.player.name.localeCompare(right.player.name, "ko");
      if (sortOrder === "seed") return (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER);
      return 0;
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
      </div>

      {query?.added ? <p className="admin-inline-message success">참가자가 추가되었습니다.</p> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {playersError ? <p className="admin-inline-message error">선수 마스터를 불러오지 못했습니다: {playersError.message}</p> : null}
      {eventPlayersError ? <p className="admin-inline-message error">참가 명단을 불러오지 못했습니다: {eventPlayersError.message}</p> : null}

      <section className="participant-summary-grid">
        <SummaryCard label="전체 참가자" value={participantList.length} />
        {detail.event_type === "blue_white" ? <SummaryCard label={detail.team_label_1 ?? "팀1"} value={team1Count} /> : null}
        {detail.event_type === "blue_white" ? <SummaryCard label={detail.team_label_2 ?? "팀2"} value={team2Count} /> : null}
        <SummaryCard label="팀 미지정" value={unassignedCount} />
      </section>

      <section className="admin-stack">
        <SectionHeader title="참가자 추가" description="이미 등록된 선수를 골라 연결하거나, 없는 사람이면 바로 등록하면서 추가합니다." />
        <div className="participant-add-grid">
          <AddEventPlayerForm event={detail} players={availablePlayers} teamOptions={teamOptions} />
          <CreateEventPlayerForm event={detail} teamOptions={teamOptions} nationalLevelOptions={nationalLevelOptions} regionalLevelOptions={regionalLevelOptions} />
        </div>
      </section>

      <section className="admin-stack">
        <SectionHeader title="현재 참가자" description="같은 선수는 동일 일정에 한 번만 추가됩니다." />

        <form method="GET" className="participant-search-row">
          <input type="hidden" name="team" value={selectedTeam ?? ""} />
          <input type="hidden" name="sort" value={sortOrder === "recent" ? "" : sortOrder} />
          <input type="search" name="q" defaultValue={query?.q ?? ""} placeholder="이름으로 검색" aria-label="참가자 이름 검색" />
          <button type="submit" className="primary-button">검색</button>
        </form>

        <div className="filter-pill-row">
          <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { sort: undefined })} className={`filter-pill${sortOrder === "recent" ? " active" : ""}`}>등록순</a>
          <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { sort: "name" })} className={`filter-pill${sortOrder === "name" ? " active" : ""}`}>이름순</a>
          <a href={buildParticipantsHref({ team: selectedTeam ?? undefined, sort: sortOrder, q: query?.q }, { sort: "seed" })} className={`filter-pill${sortOrder === "seed" ? " active" : ""}`}>시드순</a>
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
            {visibleParticipants.map((participant) => (
              <article key={participant.id} className="participant-card">
                <div className="participant-card-top">
                  <div className="player-team-stack">
                    <div className="player-primary-text">{participant.player.name}</div>
                    {participant.team ? <span className="team-caption" style={getTeamAccentStyle(participant.team)}>{participant.team}</span> : null}
                    <div className="participant-meta-row">
                      <span className={`participant-info-chip${participant.player.gender ? "" : " chip-muted"}`}>{participant.player.gender ?? "구분 미정"}</span>
                      <span className={`participant-info-chip${participant.player.level ? "" : " chip-muted"}`}>{participant.player.level ?? "레벨 미정"}</span>
                      {participant.player.affiliation ? <span className="participant-info-chip">{participant.player.affiliation}</span> : null}
                      {participant.player.english_id ? <span className="participant-info-chip">{participant.player.english_id}</span> : null}
                    </div>
                  </div>
                  <div className="participant-meta-row">
                    <span className={`participant-info-chip${participant.seed ? "" : " chip-muted"}`}>시드 {participant.seed ?? "없음"}</span>
                    <span className={`participant-info-chip${participant.player.national_level ? "" : " chip-muted"}`}>전국 {participant.player.national_level ?? "미지정"}</span>
                    <span className={`participant-info-chip${participant.player.regional_level ? "" : " chip-muted"}`}>지역 {participant.player.regional_level ?? "미지정"}</span>
                    {participant.player.phone ? <span className="participant-info-chip">{participant.player.phone}</span> : null}
                  </div>
                </div>
                {participant.note ? <div className="participant-note-card"><p className="player-secondary-text" style={{ margin: 0 }}>{participant.note}</p></div> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
