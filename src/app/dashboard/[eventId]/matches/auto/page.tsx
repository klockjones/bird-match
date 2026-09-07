import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AutoGenerateMatchesForm } from "@/components/dashboard/auto-generate-matches-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";
import { sortParticipantsByTeamAndName } from "@/lib/utils/player-display";

type AutoMatchesPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

type EventPlayerRow = {
  id: string;
  team: string | null;
  seed: number | null;
  note: string | null;
  created_at: string;
  players: PlayerItem | PlayerItem[] | null;
};

export default async function AutoMatchesPage({ params, searchParams }: AutoMatchesPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event, error: eventError }, { data: eventPlayers, error: eventPlayersError }, { data: matches }] = await Promise.all([
    supabase.from("events").select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at").eq("id", eventId).single(),
    supabase.from("event_players").select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at)").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("matches").select("match_no,sort_order").eq("event_id", eventId),
  ]);

  if (eventError || !event) notFound();

  const detail = event as EventDetailItem;
  const participants = sortParticipantsByTeamAndName(
    ((eventPlayers ?? []) as EventPlayerRow[])
      .map((item) => {
        const player = Array.isArray(item.players) ? item.players[0] : item.players;
        if (!player) return null;
        return { id: item.id, team: item.team, seed: item.seed, note: item.note, created_at: item.created_at, player } satisfies EventPlayerItem;
      })
      .filter((item): item is EventPlayerItem => Boolean(item)),
  );

  const existingMatches = matches ?? [];
  const nextMatchNo = Math.max(0, ...existingMatches.map((match) => match.match_no)) + 1;
  const nextSortOrder = Math.max(0, ...existingMatches.map((match) => match.sort_order)) + 1;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}/matches`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>대진표 자동 생성</h1>
        <p className="surface-copy" style={{ margin: 0 }}>지역급수를 기준으로 남복/혼복 대진표를 랜덤 생성합니다. 결과를 확인한 뒤 등록하세요.</p>
      </div>

      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {eventPlayersError ? <p className="admin-inline-message error">참가자 목록을 불러오지 못했습니다: {eventPlayersError.message}</p> : null}

      <AutoGenerateMatchesForm event={detail} participants={participants} nextMatchNo={nextMatchNo} nextSortOrder={nextSortOrder} />
    </main>
  );
}
