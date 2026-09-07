import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateEventPlayerForm } from "@/components/dashboard/create-event-player-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { Toast } from "@/components/ui/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";
import { getEffectiveTeam } from "@/lib/utils/player-display";

type NewEventPlayerPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ added?: string; error?: string; t?: string }>;
};

type EventPlayerRow = {
  id: string;
  team: string | null;
  seed: number | null;
  note: string | null;
  created_at: string;
  players: PlayerItem | PlayerItem[] | null;
};

export default async function NewEventPlayerPage({ params, searchParams }: NewEventPlayerPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: event, error: eventError }, { data: eventPlayers }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase
      .from("event_players")
      .select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at)")
      .eq("event_id", eventId),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;
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

  const teamOptions = [...new Set(participantList.map((item) => getEffectiveTeam(item)).filter((team): team is string => Boolean(team)))];
  const nationalLevelOptions = [...new Set(participantList.map((item) => item.player.national_level).filter((value): value is string => Boolean(value)))];
  const regionalLevelOptions = [...new Set(participantList.map((item) => item.player.regional_level).filter((value): value is string => Boolean(value)))];

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}/players`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>참가 명단 추가 (수동입력)</h1>
        <p className="surface-copy" style={{ margin: 0 }}>{detail.title} 일정 — 선수 마스터에 없는 사람을 바로 등록하면서 이 일정에 추가합니다.</p>
      </div>

      {query?.added ? <Toast key={query.t} message="참가자가 추가되었습니다. 이어서 다음 참가자를 등록할 수 있습니다." /> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}

      <CreateEventPlayerForm event={detail} teamOptions={teamOptions} nationalLevelOptions={nationalLevelOptions} regionalLevelOptions={regionalLevelOptions} />
    </main>
  );
}
