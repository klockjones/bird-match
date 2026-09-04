import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CreateMatchForm } from "@/components/dashboard/create-match-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { Toast } from "@/components/ui/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";

type NewMatchPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ created?: string; error?: string; t?: string }>;
};

type EventPlayerRow = {
  id: string;
  team: string | null;
  seed: number | null;
  note: string | null;
  created_at: string;
  players: PlayerItem | PlayerItem[] | null;
};

export default async function NewMatchPage({ params, searchParams }: NewMatchPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event, error: eventError }, { data: eventPlayers, error: eventPlayersError }] = await Promise.all([
    supabase.from("events").select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at").eq("id", eventId).single(),
    supabase.from("event_players").select("id,team,seed,note,created_at,players(id,name,gender,level,phone,memo,is_active,created_at)").eq("event_id", eventId).order("created_at", { ascending: false }),
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

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}/matches`} className="operator-menu-arrow" aria-label="경기 관리로 이동">←</Link>
          <span>경기 관리로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>경기 생성</h1>
      </div>

      {query?.created ? <Toast key={query.t} message="경기가 생성되었습니다. 이어서 다음 경기를 등록할 수 있습니다." /> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {eventPlayersError ? <p className="admin-inline-message error">참가자 목록을 불러오지 못했습니다: {eventPlayersError.message}</p> : null}

      <CreateMatchForm event={detail} participants={participants} />
    </main>
  );
}
