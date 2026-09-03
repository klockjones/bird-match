import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AddEventPlayerForm } from "@/components/dashboard/add-event-player-form";
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
  }>;
};

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
      .select("id,name,gender,level,phone,memo,is_active,created_at")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("event_players")
      .select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,is_active,created_at)")
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

      <AddEventPlayerForm event={detail} players={availablePlayers} />

      <section className="admin-stack">
        <SectionHeader title="현재 참가자" description="같은 선수는 동일 이벤트에 한 번만 추가됩니다." />

        {participantList.length === 0 ? (
          <EmptyStateCard message="아직 참가자가 없습니다." />
        ) : (
          <div className="admin-stack">
            {participantList.map((participant) => (
              <article key={participant.id} className="participant-card">
                <div className="participant-card-top">
                  <div className="player-team-stack">
                    <div className="player-primary-text">{participant.player.name}</div>
                    {participant.team ? <span className="team-caption" style={getTeamAccentStyle(participant.team)}>{participant.team}</span> : null}
                    <div className="participant-meta-row">
                      <span className="participant-info-chip">{participant.player.gender ?? "구분 미정"}</span>
                      <span className="participant-info-chip">{participant.player.level ?? "레벨 미정"}</span>
                    </div>
                  </div>
                  <div className="participant-meta-row">
                    <span className="participant-info-chip">시드 {participant.seed ?? "없음"}</span>
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
