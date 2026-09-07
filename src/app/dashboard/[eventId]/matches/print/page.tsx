import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/ui/print-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem, MatchPlayerSlot } from "@/lib/types/match";
import type { PlayerItem } from "@/lib/types/player";
import { formatDateOnly, formatTimeOnly } from "@/lib/utils/format-date";
import { getPlayerIdentity } from "@/lib/utils/player-display";
import { getMatchStatusLabel } from "@/lib/utils/status-labels";

type PrintMatchesPageProps = {
  params: Promise<{ eventId: string }>;
};

type MatchRow = Omit<MatchItem, "match_players"> & {
  match_players: Array<{
    side: "A" | "B";
    position: number;
    players: PlayerItem | PlayerItem[] | null;
  }>;
};

function getSidePlayers(match: MatchItem, side: "A" | "B") {
  return match.match_players.filter((slot) => slot.side === side);
}

export default async function PrintMatchesPage({ params }: PrintMatchesPageProps) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event, error: eventError }, { data: matches, error: matchesError }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase
      .from("matches")
      .select(
        "id,event_id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,created_at,updated_at,match_players(side,position,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at))",
      )
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("match_no", { ascending: true }),
  ]);

  if (eventError || !event) notFound();
  if (matchesError) notFound();

  const detail = event as EventDetailItem;
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

  return (
    <main className="print-page-shell">
      <div className="no-print admin-page-shell" style={{ paddingBottom: 0 }}>
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}/matches`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <h1 style={{ margin: 0 }}>경기표 인쇄 (A4)</h1>
        <p className="surface-copy" style={{ margin: 0 }}>{detail.title} 일정 — 브라우저 인쇄 대화상자에서 &quot;PDF로 저장&quot;을 선택하면 파일로 저장할 수 있습니다.</p>
        <PrintButton />
      </div>

      <div className="print-sheet">
        <h1 className="print-title">{detail.title}</h1>
        <p className="print-subtitle">{detail.event_date ? formatDateOnly(detail.event_date) : "날짜 미정"} · {detail.location ?? "장소 미정"} · 총 {matchList.length}경기</p>

        <table className="print-match-table">
          <thead>
            <tr>
              <th>No</th>
              <th>라운드</th>
              <th>코트</th>
              <th>시간</th>
              <th>A</th>
              <th>B</th>
              <th>점수</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {matchList.map((match) => (
              <tr key={match.id}>
                <td>{match.match_no}</td>
                <td>{match.round_name ?? "-"}</td>
                <td>{match.court_no ?? "-"}</td>
                <td>{formatTimeOnly(match.scheduled_at)}</td>
                <td>{getSidePlayers(match, "A").map((slot) => getPlayerIdentity(slot.player)).join(" · ")}</td>
                <td>{getSidePlayers(match, "B").map((slot) => getPlayerIdentity(slot.player)).join(" · ")}</td>
                <td>{match.status === "done" ? `${match.team1_score}:${match.team2_score}` : "-"}</td>
                <td>{getMatchStatusLabel(match.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
